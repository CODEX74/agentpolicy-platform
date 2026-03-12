import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDemoSpentToday } from '@/lib/db/demo-transactions';
import { getMarketPrices } from '@/lib/ai/agent-trader';

/**
 * Текст сообщения «оставшийся дневной лимит» по агентам.
 * GET /api/telegram/daily?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const param = req.nextUrl.searchParams.get('secret');
  if (!secret || param !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = process.env.TELEGRAM_USER_EMAIL?.trim();
  if (!userEmail) {
    return NextResponse.json({ text: 'Задайте TELEGRAM_USER_EMAIL в .env.local' });
  }
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  const [agents, marketPrices] = user
    ? await Promise.all([
        prisma.agent.findMany({ where: { userId: user.id } }),
        getMarketPrices(),
      ])
    : [[], {}];
  if (!user || agents.length === 0) {
    return NextResponse.json({
      text: '📅 Оставшийся дневной лимит\n\nНет агентов. Создайте агента на сайте и настройте политику.',
    });
  }
  const lines = ['📅 Оставшийся дневной лимит', ''];

  const ethPriceUsd = (marketPrices as any).ETH ?? 0;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  for (const agent of agents) {
    // Демо-агенты: считаем лимиты в USDT по демо-политике.
    if (agent.agentMode === 'DEMO') {
      const policy = await prisma.policy.findUnique({
        where: { userId_agentId: { userId: user.id, agentId: agent.id } },
      });
      const dailyLimit = policy?.dailyLimit ?? -1;
      const spentToday = await getDemoSpentToday(agent.id, userEmail);
      if (dailyLimit < 0) {
        lines.push(
          `• ${agent.name}: без лимита (потрачено сегодня: ${spentToday.toFixed(2)} USDT)`
        );
      } else {
        const remaining = Math.max(0, dailyLimit - spentToday);
        lines.push(
          `• ${agent.name}: ${remaining.toFixed(2)} USDT из ${dailyLimit} (потрачено сегодня: ${spentToday.toFixed(2)} USDT)`
        );
      }
      continue;
    }

    // Реальные агенты: дневной лимит и траты в ETH.
    if (agent.agentMode === 'WALLET') {
      const dailyLimitEth = agent.realDailyLimitUsd ?? -1;

      const agg = await prisma.realTransaction.aggregate({
        where: {
          agentId: agent.id,
          userId: user.id,
          createdAt: { gte: startOfDay },
        },
        _sum: { amountUsd: true },
      });
      const spentUsd = agg._sum.amountUsd ?? 0;
      const spentEth =
        ethPriceUsd && Number.isFinite(ethPriceUsd) ? spentUsd / ethPriceUsd : 0;

      if (dailyLimitEth < 0) {
        lines.push(
          `• ${agent.name}: без лимита (потрачено сегодня: ${spentEth.toFixed(4)} ETH)`
        );
      } else {
        const remainingEth = Math.max(0, dailyLimitEth - spentEth);
        lines.push(
          `• ${agent.name}: ${remainingEth.toFixed(4)} ETH из ${dailyLimitEth} (потрачено сегодня: ${spentEth.toFixed(4)} ETH)`
        );
      }
      continue;
    }
  }
  return NextResponse.json({ text: lines.join('\n').slice(0, 4096) });
}

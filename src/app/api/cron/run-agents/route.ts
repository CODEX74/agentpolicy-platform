import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDemoPositions } from '@/lib/db/demo-transactions';
import { runAgentOnce, type RunAgentResult } from '@/lib/agent-run';
import { sendTelegramMessageToChat } from '@/lib/telegram';
import { getTelegramIdByEmail } from '@/lib/db/user-telegram';

/**
 * Крон для агентов с run24_7: запускает один цикл принятия решения для каждого такого агента.
 * Вызывать по расписанию (например каждые 5–15 мин) через Vercel Cron или внешний сервис.
 *
 * Защита: заголовок Authorization: Bearer <CRON_SECRET> или ?secret=CRON_SECRET
 */
export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured. Set in .env.local for 24/7 cron.' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get('secret');
  const provided = bearer ?? querySecret ?? '';

  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const agents = await prisma.agent.findMany({
    where: { run24_7: true, demoBalance: { gt: 0 } },
    include: { user: true },
  });
  const results: { agentId: string; agentName: string; userEmail: string; result: RunAgentResult; positions: any[] }[] = [];

  for (const agent of agents) {
    const userEmail = agent.user.email;
    if (!userEmail) continue;
    const result = await runAgentOnce(agent.id, userEmail);
    const positions = await getDemoPositions(agent.id, userEmail);
    results.push({ agentId: agent.id, agentName: agent.name, userEmail, result, positions });
  }

  const resultsForJson = results.map((r) => ({
    agentId: r.agentId,
    agentName: r.agentName,
    action: r.result.action,
    reason: r.result.reason,
    error: r.result.error,
    asset: r.result.asset,
    priceReason: r.result.priceReason,
    termDays: r.result.termDays,
    plans: r.result.plans,
    assetPriceUsd: r.result.assetPriceUsd,
  }));

  // Уведомления: отправляем каждому пользователю в его Telegram chat id (если привязан)
  const byUser = new Map<string, typeof results>();
  for (const r of results) {
    const key = r.userEmail.toLowerCase();
    byUser.set(key, [...(byUser.get(key) ?? []), r]);
  }

  const telegramByUser: Record<string, { sent: boolean; error?: string }> = {};
  for (const [email, userResults] of byUser.entries()) {
    const chatId = await getTelegramIdByEmail(email);
    if (!chatId) continue;
    const lines =
      userResults.length > 0
        ? [
            `🤖 Агенты 24/7 (${new Date().toLocaleString('ru-RU')})`,
            '',
            ...userResults.map((r) => {
              const a =
                r.result.action === 'hold'
                  ? '⏸ Держать'
                  : r.result.action === 'buy_eth' && r.result.asset
                    ? `▶ Покупка ${r.result.asset}`
                    : `▶ ${r.result.action}`;
              const reason = r.result.reason ?? r.result.error ?? '—';
              const balanceStr = r.result.demoBalance != null ? `${r.result.demoBalance} USDT` : '—';
              const parts = [`• ${r.agentName}: ${a}`, `Демо-баланс: ${balanceStr}`];
              if (r.positions?.length) {
                parts.push(
                  'Позиции:',
                  ...r.positions.map((p: any) => {
                    const qty = p.quantity < 0.01 ? p.quantity.toExponential(2) : p.quantity.toFixed(4);
                    const totalUsd = p.totalUsdSpent.toFixed(2);
                    return `${p.asset} — ${qty} — $${totalUsd}`;
                  })
                );
              }
              parts.push(`Обоснование: ${reason}`);
              if (r.result.action === 'buy_eth' && r.result.asset) {
                if (r.result.assetPriceUsd != null) parts.push(`Цена покупки: $${r.result.assetPriceUsd} (${r.result.asset})`);
                if (r.result.termDays != null) parts.push(`Срок: ${r.result.termDays} дн.`);
                if (r.result.priceReason) parts.push(`Почему эта цена: ${r.result.priceReason}`);
                if (r.result.plans) parts.push(`Планы: ${r.result.plans}`);
              }
              return parts.join('\n');
            }),
          ]
        : [`🤖 Крон 24/7 (${new Date().toLocaleString('ru-RU')})`, '', 'Нет активных агентов 24/7.'];
    const res = await sendTelegramMessageToChat(lines.join('\n').slice(0, 4096), chatId);
    telegramByUser[email] = { sent: res.ok, error: res.error };
  }

  const hintEmpty =
    agents.length === 0
      ? 'Локально: запустите npm run cron в отдельном терминале. На сервере: включите «Работать 24/7» и задайте демо-баланс > 0 агенту на странице агента.'
      : undefined;

  return NextResponse.json({
    ok: true,
    ran: agents.length,
    results: resultsForJson,
    telegramByUser,
    hintEmpty,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDemoPositions, type DemoPosition } from '@/lib/db/demo-transactions';
import { runAgentOnce, type RunAgentResult, getMockMarketTrend } from '@/lib/agent-run';
import { sendTelegramMessageToChat } from '@/lib/telegram';
import { getTelegramIdByEmail } from '@/lib/db/user-telegram';
import { formatAssetQuantity } from '@/lib/utils/format';
import { getAgentTradeDecision, getMarketPrices, getUsdtPriceUsd } from '@/lib/ai/agent-trader';

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

  let agents;
  try {
    agents = await prisma.agent.findMany({
      where: { run24_7: true, demoBalance: { gt: 0 } },
      include: { user: true },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('WITHIN GROUP is required for ordered-set aggregate mode')) {
      console.error('[cron run-agents] prisma.agent.findMany failed, skipping run:', msg);
      return NextResponse.json({
        ok: true,
        ran: 0,
        results: [],
        realResults: [],
        telegramByUser: {},
        hintEmpty:
          'Ошибка подключения к базе данных (WITHIN GROUP). Крон пропущен, проверьте версию Postgres.',
      });
    }
    throw e;
  }
  const results: {
    agentId: string;
    agentName: string;
    userEmail: string;
    result: RunAgentResult;
    positions: DemoPosition[];
  }[] = [];

  for (const agent of agents) {
    const userEmail = agent.user.email;
    if (!userEmail) continue;
    const result = await runAgentOnce(agent.id, userEmail);
    const positions = await getDemoPositions(agent.id, userEmail);
    results.push({ agentId: agent.id, agentName: agent.name, userEmail, result, positions });
  }

  // Real-wallet agents (mode = WALLET, realTradingEnabled = true)
  const realAgents = await prisma.agent.findMany({
    where: { run24_7: true, agentMode: 'WALLET', realTradingEnabled: true },
    include: { user: true },
  });

  const realResults: {
    agentId: string;
    agentName: string;
    userEmail: string;
    action: string;
    reason?: string;
    error?: string;
    asset?: string;
    amountUsd?: number;
  }[] = [];

  if (realAgents.length > 0) {
    const [marketPrices, usdtPrice] = await Promise.all([getMarketPrices(), getUsdtPriceUsd()]);
    const marketTrend = getMockMarketTrend();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const agent of realAgents) {
      const userEmail = agent.user.email;
      if (!userEmail || !agent.realWalletAddress) continue;

      const agg = await prisma.realTransaction.aggregate({
        where: {
          agentId: agent.id,
          userId: agent.user.id,
          createdAt: { gte: today },
        },
        _sum: { amountUsd: true },
      });
      const spentToday = agg._sum.amountUsd ?? 0;
      const dailyLimit = agent.realDailyLimitUsd ?? -1;
      const maxPerTx = agent.realMaxPositionUsd ?? -1;

      const input = {
        agentName: agent.name,
        agentType: agent.agentType as 'INVESTOR' | 'TRADER',
        demoBalanceEth: dailyLimit > 0 ? dailyLimit : 0,
        policy: {
          dailyLimit,
          weeklyLimit: -1,
          maxPerTransaction: maxPerTx,
          allowedOperations: ['buy', 'sell'] as string[],
        },
        spentTodayEth: spentToday,
        spentWeekEth: spentToday,
        ethPriceUsd: usdtPrice || 1,
        marketPrices,
        marketTrend,
      };

      const decisionResult = await getAgentTradeDecision(input);
      const decision = decisionResult.decision;

      if (!decision) {
        realResults.push({
          agentId: agent.id,
          agentName: agent.name,
          userEmail,
          action: 'hold',
          reason: decisionResult.error,
          error: decisionResult.error,
        });
        continue;
      }

      const amount = decision.amountEth ?? 0;
      if (decision.action !== 'buy_coin' || amount <= 0) {
        realResults.push({
          agentId: agent.id,
          agentName: agent.name,
          userEmail,
          action: decision.action,
          reason: decision.reason,
          asset: decision.asset,
        });
        continue;
      }

      const allowedByDaily = dailyLimit < 0 || spentToday + amount <= dailyLimit;
      const allowedByMax = maxPerTx < 0 || amount <= maxPerTx;
      if (!allowedByDaily || !allowedByMax) {
        realResults.push({
          agentId: agent.id,
          agentName: agent.name,
          userEmail,
          action: 'hold',
          reason: `Решение отклонено по лимитам real-wallet. ${decision.reason}`,
          asset: decision.asset,
        });
        continue;
      }

      // MVP: фиксируем решение в базе как RealTransaction без реальной on-chain транзакции.
      await prisma.realTransaction.create({
        data: {
          agentId: agent.id,
          userId: agent.user.id,
          txHash: 'virtual',
          asset: decision.asset ?? 'USDC',
          amountUsd: amount,
          side: 'buy',
          network: agent.realWalletNetwork ?? 'base',
          walletAddress: agent.realWalletAddress,
        },
      });

      realResults.push({
        agentId: agent.id,
        agentName: agent.name,
        userEmail,
        action: 'buy_coin',
        reason: decision.reason,
        asset: decision.asset,
        amountUsd: amount,
      });
    }
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
  const byUser = new Map<string, { demo: (typeof results)[number][]; real: typeof realResults }>();
  for (const r of results) {
    const key = r.userEmail.toLowerCase();
    const prev = byUser.get(key) ?? { demo: [], real: [] };
    byUser.set(key, { demo: [...prev.demo, r], real: prev.real });
  }
  for (const rr of realResults) {
    const key = rr.userEmail.toLowerCase();
    const prev = byUser.get(key) ?? { demo: [], real: [] };
    byUser.set(key, { demo: prev.demo, real: [...prev.real, rr] });
  }

  const telegramByUser: Record<string, { sent: boolean; error?: string }> = {};
  for (const [email, grouped] of byUser.entries()) {
    const chatId = await getTelegramIdByEmail(email);
    if (!chatId) continue;
    const hasDemo = grouped.demo.length > 0;
    const hasReal = grouped.real.length > 0;
    const lines =
      hasDemo || hasReal
        ? [
            `🤖 Агенты 24/7 (${new Date().toLocaleString('ru-RU')})`,
            '',
            ...grouped.demo.flatMap((r, idx) => {
              const a =
                r.result.action === 'hold'
                  ? '⏸ Держать'
                  : r.result.action === 'buy_coin' && r.result.asset
                    ? `▶ Покупка ${r.result.asset}`
                    : r.result.action === 'sell_coin' && r.result.asset
                      ? `▶ Продажа ${r.result.asset}`
                    : `▶ ${r.result.action}`;
              const reason = r.result.reason ?? r.result.error ?? '—';
              const balanceStr = r.result.demoBalance != null ? `${r.result.demoBalance} USDT` : '—';
              const parts = [`• ${r.agentName}: ${a}`, `Демо-баланс: ${balanceStr}`];
              if (r.positions?.length) {
                parts.push(
                  'Позиции:',
                  ...r.positions.map((p) => {
                    const qty = formatAssetQuantity(p.quantity);
                    const totalUsd = p.totalUsdSpent.toFixed(2);
                    return `${p.asset} — ${qty} — $${totalUsd}`;
                  })
                );
              }
              parts.push(`Обоснование: ${reason}`);
              if (r.result.action === 'buy_coin' && r.result.asset) {
                if (r.result.amountEth != null && r.result.assetPriceUsd != null && r.result.assetPriceUsd > 0) {
                  const boughtQty = r.result.amountEth / r.result.assetPriceUsd;
                  parts.push(`Куплено: ${formatAssetQuantity(boughtQty)} ${r.result.asset} (на ${r.result.amountEth} USDT)`);
                }
                if (r.result.assetPriceUsd != null) parts.push(`Цена покупки: $${r.result.assetPriceUsd} (${r.result.asset})`);
                if (r.result.termDays != null) parts.push(`Срок: ${r.result.termDays} дн.`);
                if (r.result.termMinutes != null) parts.push(`Срок: ${r.result.termMinutes} мин.`);
                if (r.result.priceReason) parts.push(`Почему эта цена: ${r.result.priceReason}`);
                if (r.result.plans) parts.push(`Планы: ${r.result.plans}`);
              }
              if (r.result.action === 'sell_coin' && r.result.asset) {
                if (r.result.amountEth != null && r.result.assetPriceUsd != null && r.result.assetPriceUsd > 0) {
                  const soldQty = r.result.amountEth / r.result.assetPriceUsd;
                  parts.push(`Продано: ${formatAssetQuantity(soldQty)} ${r.result.asset} (получено ${r.result.amountEth} USDT)`);
                }
                if (r.result.assetPriceUsd != null) parts.push(`Цена продажи: $${r.result.assetPriceUsd} (${r.result.asset})`);
                if (r.result.termDays != null) parts.push(`Срок: ${r.result.termDays} дн.`);
                if (r.result.termMinutes != null) parts.push(`Срок: ${r.result.termMinutes} мин.`);
                if (r.result.priceReason) parts.push(`Почему эта цена: ${r.result.priceReason}`);
                if (r.result.plans) parts.push(`Планы: ${r.result.plans}`);
              }
              const block = parts.join('\n');
              return idx === grouped.demo.length - 1 ? [block] : [block, ''];
            }),
            ...(hasReal
              ? [
                  '',
                  '💼 Реальные решения (MVP, без on-chain сделок):',
                  '',
                  ...grouped.real.flatMap((r, idx) => {
                    const header = `• ${r.agentName}: ${r.action === 'buy_coin' && r.asset ? `Покупка ${r.asset}` : r.action}`;
                    const amountLine =
                      r.amountUsd != null ? `Сумма: ${r.amountUsd.toFixed(2)} USDC` : undefined;
                    const parts = [header];
                    if (amountLine) parts.push(amountLine);
                    if (r.reason) parts.push(`Обоснование: ${r.reason}`);
                    const block = parts.join('\n');
                    return idx === grouped.real.length - 1 ? [block] : [block, ''];
                  }),
                ]
              : []),
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
    realResults,
    telegramByUser,
    hintEmpty,
  });
}

import { prisma } from '@/lib/db/prisma';
import {
  getDemoSpentToday,
  getDemoSpentThisWeek,
  addDemoTransaction,
  getDemoPositions,
  getOldestBuyAtForAsset,
} from '@/lib/db/demo-transactions';
import {
  getUsdtPriceUsd,
  getMarketPrices,
  getAgentTradeDecision,
} from '@/lib/ai/agent-trader';
import { getOpenAiKeyByEmail } from '@/lib/db/user-openai';

/** Мок тренда (можно заменить на реальные данные) */
export function getMockMarketTrend(): 'up' | 'down' | 'stable' {
  const r = Math.random();
  if (r < 0.33) return 'down';
  if (r < 0.66) return 'up';
  return 'stable';
}

export interface RunAgentResult {
  ok: boolean;
  action: string;
  reason?: string;
  demoBalance?: number;
  amountEth?: number;
  error?: string;
  asset?: string;
  priceReason?: string;
  termDays?: number;
  termMinutes?: number;
  plans?: string;
  /** Цена купленного актива в USD на момент решения */
  assetPriceUsd?: number;
}

/**
 * Один цикл принятия решения агентом и применения результата (в рамках политики).
 * Используется и для ручного запуска (POST /api/agents/[id]/run), и для крона 24/7.
 */
export async function runAgentOnce(
  agentId: string,
  userEmail: string
): Promise<RunAgentResult> {
  const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
  if (!user) return { ok: false, action: 'hold', error: 'User not found' };

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId: user.id },
  });
  if (!agent) return { ok: false, action: 'hold', error: 'Agent not found' };

  const balance = agent.demoBalance ?? 0;
  if (balance <= 0) {
    return { ok: false, action: 'hold', error: 'Установите демо-баланс агенту', demoBalance: 0 };
  }

  const policyRow = await prisma.policy.findUnique({
    where: { userId_agentId: { userId: user.id, agentId } },
  });
  const policy = policyRow
    ? {
        dailyLimit: policyRow.dailyLimit,
        weeklyLimit: policyRow.weeklyLimit,
        maxPerTransaction: policyRow.maxPerTransaction,
        allowedOperations: policyRow.allowedOperations ?? ['transfer'],
      }
    : {
        dailyLimit: 1,
        weeklyLimit: 5,
        maxPerTransaction: 0.5,
        allowedOperations: ['transfer'],
      };

  const spentToday = await getDemoSpentToday(agentId, userEmail);
  const spentWeek = await getDemoSpentThisWeek(agentId, userEmail);
  const [marketPrices, usdtPrice] = await Promise.all([getMarketPrices(), getUsdtPriceUsd()]);
  const marketTrend = getMockMarketTrend();

  const openaiKey = await getOpenAiKeyByEmail(userEmail);
  if (!openaiKey) {
    await addDemoTransaction({
      agentId,
      userEmail,
      type: 'hold',
      amountEth: 0,
      reason:
        'Не задан OpenAI API key. Зайдите в Настройки → OpenAI (ChatGPT) и укажите свой ключ (sk-...).',
      marketPriceUsd: usdtPrice || undefined,
    });
    return {
      ok: false,
      action: 'hold',
      error: 'Не задан OpenAI API key. Укажите его в Настройки → OpenAI (ChatGPT).',
      demoBalance: balance,
    };
  }

  const result = await getAgentTradeDecision({
    agentName: agent.name,
    agentType: agent.agentType,
    demoBalanceEth: balance,
    policy: {
      dailyLimit: policy.dailyLimit,
      weeklyLimit: policy.weeklyLimit,
      maxPerTransaction: policy.maxPerTransaction,
      allowedOperations: policy.allowedOperations ?? ['transfer'],
    },
    spentTodayEth: spentToday,
    spentWeekEth: spentWeek,
    ethPriceUsd: usdtPrice || 1,
    marketPrices,
    marketTrend,
  });

  const decision = result.decision;
  if (!decision) {
    return {
      ok: false,
      action: 'hold',
      error: result.error ?? 'Не удалось получить решение ИИ',
      demoBalance: balance,
    };
  }

  const amount = decision.amountEth ?? 0;
  const allowedByDaily = policy.dailyLimit < 0 || spentToday + amount <= policy.dailyLimit;
  const allowedByWeekly = policy.weeklyLimit < 0 || spentWeek + amount <= policy.weeklyLimit;
  const allowedByMax = policy.maxPerTransaction < 0 || amount <= policy.maxPerTransaction;
  const allowedByBalance = amount <= balance;

  const demoExtra = {
    asset: decision.asset,
    priceReason: decision.priceReason,
    termDays: decision.termDays,
    termMinutes: decision.termMinutes,
    plans: decision.plans,
    assetPriceUsd: decision.asset ? marketPrices[decision.asset] : undefined,
  };

  if (decision.action === 'hold' || amount === 0) {
    await addDemoTransaction({
      agentId,
      userEmail,
      type: 'hold',
      amountEth: 0,
      reason: decision.reason,
      marketPriceUsd: usdtPrice || undefined,
      ...demoExtra,
    });
    return { ok: true, action: 'hold', reason: decision.reason, demoBalance: balance };
  }

  if (decision.action === 'buy_eth' || decision.action === 'transfer') {
    const assetUpper = (decision.asset ?? '').toUpperCase().trim();
    if (assetUpper === 'USDT' || assetUpper === 'USDC') {
      await addDemoTransaction({
        agentId,
        userEmail,
        type: 'hold',
        amountEth: 0,
        reason: `Покупка стейблкоина не нужна: баланс уже в USDT. ${decision.reason}`,
        marketPriceUsd: usdtPrice || undefined,
        ...demoExtra,
      });
      return {
        ok: true,
        action: 'hold',
        reason: `Баланс уже в USDT, покупка USDT/USDC не выполняется. ${decision.reason}`,
        demoBalance: balance,
      };
    }
    if (!allowedByBalance) {
      await addDemoTransaction({
        agentId,
        userEmail,
        type: 'hold',
        amountEth: 0,
        reason: `Отказ: недостаточно баланса. ${decision.reason}`,
        marketPriceUsd: usdtPrice || undefined,
        ...demoExtra,
      });
      return {
        ok: true,
        action: 'hold',
        reason: `Недостаточно баланса. ${decision.reason}`,
        demoBalance: balance,
      };
    }
    if (!allowedByDaily || !allowedByWeekly || !allowedByMax) {
      await addDemoTransaction({
        agentId,
        userEmail,
        type: 'hold',
        amountEth: 0,
        reason: `Отказ по лимитам политики. ${decision.reason}`,
        marketPriceUsd: usdtPrice || undefined,
        ...demoExtra,
      });
      return {
        ok: true,
        action: 'hold',
        reason: `Решение отменено: превышен лимит политики. Обоснование агента: ${decision.reason}${decision.priceReason ? ` ${decision.priceReason}` : ''}`,
        demoBalance: balance,
      };
    }

    const newBalance = balance - amount;
    await prisma.agent.update({
      where: { id: agentId },
      data: { demoBalance: newBalance },
    });
    await addDemoTransaction({
      agentId,
      userEmail,
      type: decision.action,
      amountEth: amount,
      reason: decision.reason,
      marketPriceUsd: usdtPrice || undefined,
      ...demoExtra,
    });

    return {
      ok: true,
      action: decision.action,
      reason: decision.reason,
      demoBalance: newBalance,
      amountEth: amount,
      asset: decision.asset,
      priceReason: decision.priceReason,
      termDays: decision.termDays,
      termMinutes: decision.termMinutes,
      plans: decision.plans,
      assetPriceUsd: decision.asset ? marketPrices[decision.asset] : undefined,
    };
  }

  if (decision.action === 'sell_eth') {
    const asset = (decision.asset ?? '').toUpperCase().trim();
    const priceUsd = asset ? marketPrices[asset] : undefined;
    if (!asset || !priceUsd || priceUsd <= 0) {
      await addDemoTransaction({
        agentId,
        userEmail,
        type: 'hold',
        amountEth: 0,
        reason: `Продажа отменена: не указан актив или неизвестна цена. ${decision.reason}`,
        marketPriceUsd: usdtPrice || undefined,
        ...demoExtra,
      });
      return { ok: true, action: 'hold', reason: decision.reason, demoBalance: balance };
    }

    const positions = await getDemoPositions(agentId, userEmail);
    const pos = positions.find((p) => p.asset.toUpperCase() === asset);
    if (!pos || pos.quantity <= 0) {
      await addDemoTransaction({
        agentId,
        userEmail,
        type: 'hold',
        amountEth: 0,
        reason: `Продажа отменена: нет позиции ${asset}. ${decision.reason}`,
        marketPriceUsd: usdtPrice || undefined,
        ...demoExtra,
      });
      return { ok: true, action: 'hold', reason: decision.reason, demoBalance: balance };
    }

    // Для инвестора: продаём только если прошло 10+ дней с первой покупки, либо если сильная просадка.
    if (agent.agentType === 'INVESTOR') {
      const oldestBuyAt = await getOldestBuyAtForAsset({ agentId, userEmail, asset });
      const heldDays =
        oldestBuyAt != null ? (Date.now() - oldestBuyAt.getTime()) / (1000 * 60 * 60 * 24) : 0;
      const avgBuy = pos.avgPriceUsd || 0;
      const dropPct = avgBuy > 0 ? (priceUsd - avgBuy) / avgBuy : 0; // отрицательное = падение

      const MIN_DAYS = 10;
      const CRASH_DROP = -0.2; // -20%
      const allowedByTime = heldDays >= MIN_DAYS;
      const allowedByCrash = dropPct <= CRASH_DROP;

      if (!allowedByTime && !allowedByCrash) {
        const reasonHold = `Продажа отменена: для Инвестора продаём через ${MIN_DAYS}+ дней или при сильной просадке (≥20%). Сейчас удержание ~${heldDays.toFixed(1)} дн., изменение цены ~${(dropPct * 100).toFixed(1)}%. ${decision.reason}`;
        await addDemoTransaction({
          agentId,
          userEmail,
          type: 'hold',
          amountEth: 0,
          reason: reasonHold,
          marketPriceUsd: usdtPrice || undefined,
          ...demoExtra,
        });
        return { ok: true, action: 'hold', reason: reasonHold, demoBalance: balance };
      }
    }

    // Продаём всю текущую позицию по текущей цене (демо).
    const proceedsUsdt = pos.quantity * priceUsd;
    const newBalance = balance + proceedsUsdt;

    await prisma.agent.update({
      where: { id: agentId },
      data: { demoBalance: newBalance },
    });

    await addDemoTransaction({
      agentId,
      userEmail,
      type: 'sell_eth',
      amountEth: proceedsUsdt,
      reason: decision.reason,
      marketPriceUsd: usdtPrice || undefined,
      asset,
      priceReason: decision.priceReason,
      termDays: decision.termDays,
      plans: decision.plans,
      termMinutes: decision.termMinutes,
      assetPriceUsd: priceUsd,
    });

    return {
      ok: true,
      action: 'sell_eth',
      reason: decision.reason,
      demoBalance: newBalance,
      amountEth: proceedsUsdt,
      asset,
      priceReason: decision.priceReason,
      termDays: decision.termDays,
      termMinutes: decision.termMinutes,
      plans: decision.plans,
      assetPriceUsd: priceUsd,
    };
  }

  return { ok: true, action: 'hold', reason: decision.reason, demoBalance: balance };
}

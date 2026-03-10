import { prisma } from '@/lib/db/prisma';

export interface DemoPosition {
  asset: string;
  quantity: number;
  totalUsdSpent: number;
  avgPriceUsd: number;
}

export async function getDemoTransactionsByAgent(
  agentId: string,
  userEmail: string
) {
  const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
  if (!user) return [];

  const rows = await prisma.demoTransaction.findMany({
    where: { agentId, userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((t) => ({
    _id: t.id,
    agentId: t.agentId,
    userEmail,
    type: t.type,
    amountEth: t.amountEth,
    reason: t.reason,
    marketPriceUsd: t.marketPriceUsd ?? undefined,
    asset: t.asset ?? undefined,
    priceReason: t.priceReason ?? undefined,
    termDays: t.termDays ?? undefined,
    termMinutes: t.termMinutes ?? undefined,
    plans: t.plans ?? undefined,
    assetPriceUsd: t.assetPriceUsd ?? undefined,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function getDemoTransactionsByEmail(userEmail: string) {
  const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
  if (!user) return [];

  const rows = await prisma.demoTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((t) => ({
    _id: t.id,
    agentId: t.agentId,
    userEmail,
    type: t.type,
    amountEth: t.amountEth,
    reason: t.reason,
    marketPriceUsd: t.marketPriceUsd ?? undefined,
    asset: t.asset ?? undefined,
    priceReason: t.priceReason ?? undefined,
    termDays: t.termDays ?? undefined,
    termMinutes: t.termMinutes ?? undefined,
    plans: t.plans ?? undefined,
    assetPriceUsd: t.assetPriceUsd ?? undefined,
    createdAt: t.createdAt.toISOString(),
  }));
}

export async function deleteDemoTransactionsByEmail(userEmail: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
  if (!user) return 0;

  const result = await prisma.demoTransaction.deleteMany({
    where: { userId: user.id },
  });
  return result.count;
}

export async function addDemoTransaction(params: {
  agentId: string;
  userEmail: string;
  type: string;
  amountEth: number;
  reason: string;
  marketPriceUsd?: number;
  asset?: string;
  priceReason?: string;
  termDays?: number;
  termMinutes?: number;
  plans?: string;
  assetPriceUsd?: number;
}) {
  const user = await prisma.user.findUnique({ where: { email: params.userEmail.toLowerCase() } });
  if (!user) throw new Error('User not found');

  const tx = await prisma.demoTransaction.create({
    data: {
      agentId: params.agentId,
      userId: user.id,
      type: params.type,
      amountEth: params.amountEth,
      reason: params.reason,
      marketPriceUsd: params.marketPriceUsd,
      asset: params.asset,
      priceReason: params.priceReason,
      termDays: params.termDays,
      termMinutes: params.termMinutes,
      plans: params.plans,
      assetPriceUsd: params.assetPriceUsd,
    },
  });
  return {
    _id: tx.id,
    agentId: tx.agentId,
    userEmail: params.userEmail,
    type: tx.type,
    amountEth: tx.amountEth,
    reason: tx.reason,
    marketPriceUsd: tx.marketPriceUsd ?? undefined,
    asset: tx.asset ?? undefined,
    priceReason: tx.priceReason ?? undefined,
    termDays: tx.termDays ?? undefined,
    termMinutes: tx.termMinutes ?? undefined,
    plans: tx.plans ?? undefined,
    assetPriceUsd: tx.assetPriceUsd ?? undefined,
    createdAt: tx.createdAt.toISOString(),
  };
}

export async function getDemoSpentThisWeek(agentId: string, userEmail: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
  if (!user) return 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const rows = await prisma.demoTransaction.findMany({
    where: {
      agentId,
      userId: user.id,
      createdAt: { gte: weekAgo },
      // В лимиты "потрачено" считаем только покупки/переводы (sell не должен уменьшать лимит).
      type: { in: ['buy_eth', 'transfer'] },
    },
  });
  return rows.reduce((sum, t) => sum + t.amountEth, 0);
}

export async function getDemoSpentToday(agentId: string, userEmail: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
  if (!user) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await prisma.demoTransaction.findMany({
    where: {
      agentId,
      userId: user.id,
      createdAt: { gte: today },
      type: { in: ['buy_eth', 'transfer'] },
    },
  });
  return rows.reduce((sum, t) => sum + t.amountEth, 0);
}

/** Восстановить демо-баланс всех агентов пользователя до изначального. */
export async function resetAgentsDemoBalanceForUser(userEmail: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: userEmail.toLowerCase() } });
  if (!user) return;

  const agents = await prisma.agent.findMany({
    where: { userId: user.id },
  });
  for (const agent of agents) {
    const initial = agent.initialDemoBalance ?? (agent.demoBalance ?? 0);
    if (initial > 0 && agent.demoBalance !== initial) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: {
          demoBalance: initial,
          ...(agent.initialDemoBalance == null && { initialDemoBalance: initial }),
        },
      });
    }
  }
}

export async function getDemoPositions(
  agentId: string,
  userEmail: string
): Promise<DemoPosition[]> {
  const rows = await getDemoTransactionsByAgent(agentId, userEmail);
  const byAsset = new Map<string, { totalUsd: number; quantity: number }>();
  // Обрабатываем по времени (asc), чтобы корректно уменьшать позицию при sell.
  const ordered = [...rows].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const t of ordered) {
    const asset = (t.asset ?? '').toUpperCase().trim();
    if (!asset) continue;
    const price = t.assetPriceUsd && t.assetPriceUsd > 0 ? t.assetPriceUsd : null;
    if (price == null) continue;

    const cur = byAsset.get(asset) ?? { totalUsd: 0, quantity: 0 };

    if (t.type === 'buy_eth' && t.amountEth > 0) {
      const qty = t.amountEth / price;
      byAsset.set(asset, { totalUsd: cur.totalUsd + t.amountEth, quantity: cur.quantity + qty });
      continue;
    }

    if (t.type === 'sell_eth' && t.amountEth > 0) {
      // amountEth для sell — это полученные USDT (выручка)
      const sellQty = t.amountEth / price;
      if (cur.quantity <= 0) continue;
      const actualQty = Math.min(cur.quantity, sellQty);
      const avgCost = cur.totalUsd > 0 && cur.quantity > 0 ? cur.totalUsd / cur.quantity : 0;
      const costReduction = avgCost * actualQty;
      const newQty = Math.max(0, cur.quantity - actualQty);
      const newTotalUsd = Math.max(0, cur.totalUsd - costReduction);
      byAsset.set(asset, { totalUsd: newTotalUsd, quantity: newQty });
      continue;
    }
  }

  return Array.from(byAsset.entries())
    .filter(([, v]) => v.quantity > 0)
    .map(([asset, { totalUsd, quantity }]) => ({
      asset,
      quantity,
      totalUsdSpent: totalUsd,
      avgPriceUsd: quantity > 0 ? totalUsd / quantity : 0,
    }));
}

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { getDemoTransactionsByEmail, getDemoPositions } from '@/lib/db/demo-transactions';
import { getMarketPrices } from '@/lib/ai/agent-trader';

const DAYS_BACK = 14;

/** Сумма операций (USDT) по дням из демо-транзакций */
function aggregateByDay(
  transactions: { type: string; amountEth: number; createdAt: string }[]
): Record<string, number> {
  const byDay: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'hold') continue;
    const date = t.createdAt.slice(0, 10);
    byDay[date] = (byDay[date] ?? 0) + t.amountEth;
  }
  return byDay;
}

/** Даты за последние N дней в формате YYYY-MM-DD */
function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(x.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const [demo, user, marketPrices] = await Promise.all([
      getDemoTransactionsByEmail(email),
      prisma.user.findUnique({
        where: { email },
        include: { agents: true },
      }),
      getMarketPrices(),
    ]);

    const byDay = aggregateByDay(demo);
    const dates = lastNDays(DAYS_BACK);
    const balanceHistory = dates.map((date) => ({
      date,
      balance: byDay[date] ?? 0,
    }));

    const agents = user?.agents ?? [];

    // Балансы агентов (демо)
    const agentBalances = agents.map((a) => ({
      agentId: a.id,
      name: a.name,
      demoBalance: a.demoBalance ?? 0,
    }));

    // P&L по агентам (все время, по демо-транзакциям)
    const pnlByAgentMap = new Map<
      string,
      { agentId: string; name: string; totalBuys: number; totalSells: number }
    >();
    for (const a of agents) {
      pnlByAgentMap.set(a.id, {
        agentId: a.id,
        name: a.name,
        totalBuys: 0,
        totalSells: 0,
      });
    }
    for (const t of demo) {
      if (!t.agentId) continue;
      if (t.type !== 'buy_eth' && t.type !== 'sell_eth') continue;
      const rec = pnlByAgentMap.get(t.agentId);
      if (!rec) continue;
      if (t.type === 'buy_eth') rec.totalBuys += t.amountEth;
      if (t.type === 'sell_eth') rec.totalSells += t.amountEth;
    }
    const pnlByAgent = Array.from(pnlByAgentMap.values()).map((p) => ({
      agentId: p.agentId,
      name: p.name,
      pnlTotal: p.totalSells - p.totalBuys,
    }));

    // Распределение активов по агентам: текущие позиции каждого агента, оценённые по рынку
    const assetAllocationByAgent: {
      agentId: string;
      name: string;
      assets: { asset: string; valueUsd: number }[];
    }[] = [];
    for (const a of agents) {
      const positions = await getDemoPositions(a.id, email);
      const totals = new Map<string, number>();
      for (const p of positions) {
        const price = marketPrices[p.asset] ?? p.avgPriceUsd ?? 0;
        if (!price || p.quantity <= 0) continue;
        const value = p.quantity * price;
        totals.set(p.asset, (totals.get(p.asset) ?? 0) + value);
      }
      const assets = Array.from(totals.entries()).map(([asset, valueUsd]) => ({
        asset,
        valueUsd,
      }));
      assetAllocationByAgent.push({
        agentId: a.id,
        name: a.name,
        assets,
      });
    }

    // Покупки (отдельные транзакции) для каждого агента
    const buysByAgentOverTime: {
      agentId: string;
      name: string;
      date: string;
      buyAmount: number;
    }[] = [];
    for (const t of demo) {
      if (!t.agentId || t.type !== 'buy_eth') continue;
      const agentId = t.agentId;
      const rec = agentBalances.find((ab) => ab.agentId === agentId);
      const name = rec?.name ?? 'Agent';
      const date = t.createdAt; // полный ISO, чтобы различать отдельные сделки
      buysByAgentOverTime.push({
        agentId,
        name,
        date,
        buyAmount: t.amountEth,
      });
    }

    return NextResponse.json({
      balanceHistory,
      agentBalances,
      assetAllocationByAgent,
      pnlByAgent,
      buysByAgentOverTime,
    });
  } catch (err) {
    console.error('GET /api/analytics', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

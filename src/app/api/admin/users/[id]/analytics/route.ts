import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { getDemoTransactionsByEmail, getDemoPositions } from '@/lib/db/demo-transactions';
import { getMarketPrices } from '@/lib/ai/agent-trader';

const ADMIN_COOKIE_NAME = 'admin_session';
const DAYS_BACK = 14;

async function ensureAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  return Boolean(session?.value);
}

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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user?.email) {
      return NextResponse.json({ error: 'User not found or has no email' }, { status: 404 });
    }

    const email = user.email;
    const agents = await prisma.agent.findMany({ where: { userId: user.id } });

    const [demo, marketPrices] = await Promise.all([
      getDemoTransactionsByEmail(email),
      getMarketPrices(),
    ]);

    const byDay = aggregateByDay(demo);
    const dates = lastNDays(DAYS_BACK);
    const balanceHistory = dates.map((date) => ({
      date,
      balance: byDay[date] ?? 0,
    }));

    const agentBalances = agents.map((a) => ({
      agentId: a.id,
      name: a.name,
      demoBalance: a.demoBalance ?? 0,
    }));

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
      if (t.type !== 'buy_coin' && t.type !== 'sell_coin') continue;
      const rec = pnlByAgentMap.get(t.agentId);
      if (!rec) continue;
      if (t.type === 'buy_coin') rec.totalBuys += t.amountEth;
      if (t.type === 'sell_coin') rec.totalSells += t.amountEth;
    }
    const pnlByAgent = Array.from(pnlByAgentMap.values()).map((p) => ({
      agentId: p.agentId,
      name: p.name,
      pnlTotal: p.totalSells - p.totalBuys,
    }));

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

    const buysByAgentOverTime: {
      agentId: string;
      name: string;
      date: string;
      buyAmount: number;
    }[] = [];
    for (const t of demo) {
      if (!t.agentId || t.type !== 'buy_coin') continue;
      const agentId = t.agentId;
      const rec = agentBalances.find((ab) => ab.agentId === agentId);
      const name = rec?.name ?? 'Agent';
      const date = t.createdAt;
      buysByAgentOverTime.push({
        agentId,
        name,
        date,
        buyAmount: t.amountEth,
      });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      balanceHistory,
      agentBalances,
      assetAllocationByAgent,
      pnlByAgent,
      buysByAgentOverTime,
    });
  } catch (err) {
    console.error('GET /api/admin/users/[id]/analytics', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


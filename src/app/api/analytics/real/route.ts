import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { getRealWalletBalance } from '@/lib/agents/realWallet';
import { getMarketPrices, getUsdtPriceUsd } from '@/lib/ai/agent-trader';

const DAYS_BACK = 14;

interface RealTx {
  agentId: string;
  asset: string;
  amountUsd: number;
  side: string;
  createdAt: string;
}

function aggregateByDayEth(transactions: RealTx[], ethPriceUsd: number): Record<string, number> {
  const byDay: Record<string, number> = {};
  if (!ethPriceUsd || !Number.isFinite(ethPriceUsd)) return byDay;

  for (const t of transactions) {
    const date = t.createdAt.slice(0, 10);
    const amountEthApprox = t.amountUsd / ethPriceUsd;
    byDay[date] = (byDay[date] ?? 0) + Math.abs(amountEthApprox);
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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = session.user.email;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        {
          balanceHistory: [],
          agentBalances: [],
          assetAllocationByAgent: [],
          pnlByAgent: [],
          buysByAgentOverTime: [],
        },
        { status: 200 }
      );
    }

    const [agents, realTxRaw, marketPrices, usdtPrice] = await Promise.all([
      prisma.agent.findMany({
        where: { userId: user.id, agentMode: 'WALLET' },
      }),
      prisma.realTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
      }),
      getMarketPrices(),
      getUsdtPriceUsd(),
    ]);

    const ethPriceUsd = marketPrices.ETH ?? usdtPrice ?? 1;

    const since = new Date();
    since.setDate(since.getDate() - DAYS_BACK);

    const realTx: RealTx[] = realTxRaw
      .filter((t) => t.createdAt >= since)
      .map((t) => ({
        agentId: t.agentId,
        asset: t.asset,
        amountUsd: t.amountUsd,
        side: t.side,
        createdAt: t.createdAt.toISOString(),
      }));

    const byDay = aggregateByDayEth(realTx, ethPriceUsd);
    const dates = lastNDays(DAYS_BACK);
    const balanceHistory = dates.map((date) => ({
      date,
      balance: byDay[date] ?? 0,
    }));

    const agentBalances = await Promise.all(
      agents.map(async (a) => {
        const { balanceWei } = await getRealWalletBalance(a.id, user.id);
        const weiNum = Number(balanceWei || '0');
        const balanceEth = Number.isFinite(weiNum) ? weiNum / 1e18 : 0;
        return {
          agentId: a.id,
          name: a.name,
          balanceEth,
        };
      })
    );

    const pnlByAgentMap = new Map<
      string,
      { agentId: string; name: string; totalBuysEth: number; totalSellsEth: number }
    >();
    for (const a of agents) {
      pnlByAgentMap.set(a.id, {
        agentId: a.id,
        name: a.name,
        totalBuysEth: 0,
        totalSellsEth: 0,
      });
    }
    for (const t of realTx) {
      const rec = pnlByAgentMap.get(t.agentId);
      if (!rec) continue;
      const amountEthApprox = ethPriceUsd ? t.amountUsd / ethPriceUsd : 0;
      if (t.side === 'buy') rec.totalBuysEth += amountEthApprox;
      if (t.side === 'sell') rec.totalSellsEth += amountEthApprox;
    }
    const pnlByAgent = Array.from(pnlByAgentMap.values()).map((p) => ({
      agentId: p.agentId,
      name: p.name,
      pnlTotal: p.totalSellsEth - p.totalBuysEth,
    }));

    const assetAllocationByAgent: {
      agentId: string;
      name: string;
      assets: { asset: string; value: number }[];
    }[] = [];
    for (const a of agents) {
      const totals = new Map<string, number>();
      for (const t of realTx.filter((rt) => rt.agentId === a.id)) {
        const amountEthApprox = ethPriceUsd ? t.amountUsd / ethPriceUsd : 0;
        const prev = totals.get(t.asset) ?? 0;
        totals.set(t.asset, prev + amountEthApprox);
      }
      const assets = Array.from(totals.entries()).map(([asset, value]) => ({
        asset,
        value,
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
    for (const t of realTx) {
      if (t.side !== 'buy') continue;
      const agentId = t.agentId;
      const rec = agents.find((a) => a.id === agentId);
      const name = rec?.name ?? 'Agent';
      const amountEthApprox = ethPriceUsd ? t.amountUsd / ethPriceUsd : 0;
      buysByAgentOverTime.push({
        agentId,
        name,
        date: t.createdAt,
        buyAmount: amountEthApprox,
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
    console.error('GET /api/analytics/real', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


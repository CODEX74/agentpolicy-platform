import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const agent = await prisma.agent.findFirst({
      where: { id, userId: user.id },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    if (agent.mode !== 'WALLET') {
      return NextResponse.json({ error: 'Agent is not in WALLET mode' }, { status: 400 });
    }

    const { getRealWalletBalance } = await import('@/lib/agents/realWallet');
    const balance = await getRealWalletBalance(agent.id, user.id);

    return NextResponse.json({
      agentId: agent.id,
      address: balance.address,
      balanceWei: balance.balanceWei,
      network: agent.realWalletNetwork ?? null,
      asset: agent.realWalletAsset ?? 'USDC',
      realTradingEnabled: agent.realTradingEnabled,
      realMaxPositionUsd: agent.realMaxPositionUsd,
      realDailyLimitUsd: agent.realDailyLimitUsd,
      realNotes: agent.realNotes,
    });
  } catch (err) {
    console.error('GET /api/agents/[id]/real-wallet', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


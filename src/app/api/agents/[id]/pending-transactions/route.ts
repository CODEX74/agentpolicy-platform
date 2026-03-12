import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

/** Список ожидающих подписи транзакций для агента (подключённый кошелёк). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: agentId } = await params;

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: user.id },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (agent.agentMode !== 'WALLET' || !agent.realWalletAddress) {
      return NextResponse.json({ error: 'Agent has no real wallet' }, { status: 400 });
    }

    const list = await prisma.pendingRealTransaction.findMany({
      where: { agentId, userId: user.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
      list.map((p) => ({
        id: p.id,
        fromAddress: p.fromAddress,
        toAddress: p.toAddress,
        valueWei: p.valueWei,
        data: p.data,
        networkId: p.networkId,
        asset: p.asset,
        amountUsd: p.amountUsd,
        reason: p.reason,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    console.error('GET /api/agents/[id]/pending-transactions', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

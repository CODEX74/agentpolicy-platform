import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const broadcastSchema = z.object({
  txHash: z.string().min(1).max(100),
});

/**
 * После подписи транзакции в браузере пользователь отправляет txHash —
 * помечаем сделку как исполненную и создаём запись RealTransaction.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pendingId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: agentId, pendingId } = await params;

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const pending = await prisma.pendingRealTransaction.findFirst({
      where: { id: pendingId, agentId, userId: user.id },
    });
    if (!pending) return NextResponse.json({ error: 'Pending transaction not found' }, { status: 404 });
    if (pending.status !== 'pending') {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 400 });
    }

    const body = await req.json();
    const { txHash } = broadcastSchema.parse(body);

    await prisma.$transaction([
      prisma.pendingRealTransaction.update({
        where: { id: pendingId },
        data: { status: 'broadcast', txHash, updatedAt: new Date() },
      }),
      prisma.realTransaction.create({
        data: {
          agentId: pending.agentId,
          userId: pending.userId,
          txHash,
          asset: pending.asset,
          amountUsd: pending.amountUsd,
          side: 'buy',
          network: pending.networkId,
          walletAddress: pending.fromAddress,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, txHash });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('PATCH /api/agents/[id]/pending-transactions/[pendingId]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

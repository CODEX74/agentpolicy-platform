import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const bodySchema = z.object({
  walletId: z.string().min(1),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const { id: agentId } = await params;
    const body = await req.json();
    const { walletId } = bodySchema.parse(body);

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: user.id },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: user.id },
    });
    if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });

    if (wallet.agentId && wallet.agentId !== agentId) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { agentId: null },
      });
    }
    await prisma.wallet.update({
      where: { id: wallet.id },
      data: { agentId },
    });
    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { walletId: wallet.id, walletAddress: wallet.address },
    });
    return NextResponse.json({
      _id: updated.id,
      userEmail: session.user.email,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      walletId: updated.walletId,
      walletAddress: updated.walletAddress,
      demoBalance: updated.demoBalance,
      initialDemoBalance: updated.initialDemoBalance,
      run24_7: updated.run24_7,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('PUT /api/agents/[id]/wallet', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const { id: agentId } = await params;

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: user.id },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    if (agent.walletId) {
      await prisma.wallet.updateMany({
        where: { id: agent.walletId },
        data: { agentId: null },
      });
    }
    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: { walletId: null, walletAddress: null },
    });
    return NextResponse.json({
      _id: updated.id,
      userEmail: session.user.email,
      name: updated.name,
      description: updated.description,
      isActive: updated.isActive,
      walletId: updated.walletId,
      walletAddress: updated.walletAddress,
      demoBalance: updated.demoBalance,
      initialDemoBalance: updated.initialDemoBalance,
      run24_7: updated.run24_7,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('DELETE /api/agents/[id]/wallet', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

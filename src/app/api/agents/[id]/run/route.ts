import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { runAgentOnce } from '@/lib/agent-run';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const { id: agentId } = await params;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, userId: user.id },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const balance = agent.demoBalance ?? 0;
    if (balance <= 0) {
      return NextResponse.json(
        { error: 'Установите демо-баланс агенту в настройках' },
        { status: 400 }
      );
    }

    const result = await runAgentOnce(agentId, email);

    if (!result.ok && result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === 'Agent not found' ? 404 : 503 }
      );
    }

    return NextResponse.json({
      action: result.action,
      reason: result.reason,
      demoBalance: result.demoBalance,
      ...(result.amountEth != null && { amountEth: result.amountEth }),
    });
  } catch (err) {
    console.error('POST /api/agents/[id]/run', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

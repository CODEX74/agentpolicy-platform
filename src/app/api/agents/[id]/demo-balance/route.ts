import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getFileAgentById, setFileAgentDemoBalance } from '@/lib/db/file-agents';
import { getDemoPositions } from '@/lib/db/file-demo-transactions';
import { z } from 'zod';

const bodySchema = z.object({
  demoBalance: z.number().min(0).max(1_000_000),
});

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
    const agent = await getFileAgentById(id, session.user.email);
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    const positions = await getDemoPositions(id, session.user.email);
    return NextResponse.json({
      demoBalance: agent.demoBalance ?? 0,
      run24_7: agent.run24_7 ?? false,
      positions,
    });
  } catch (err) {
    console.error('GET /api/agents/[id]/demo-balance', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const { demoBalance } = bodySchema.parse(body);
    const agent = await setFileAgentDemoBalance(id, session.user.email, demoBalance);
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    return NextResponse.json({ demoBalance: agent.demoBalance ?? 0 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('PATCH /api/agents/[id]/demo-balance', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getFileAgentById, setFileAgentRun24_7 } from '@/lib/db/file-agents';
import { z } from 'zod';

const bodySchema = z.object({
  run24_7: z.boolean(),
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
    return NextResponse.json({ run24_7: agent.run24_7 ?? false });
  } catch (err) {
    console.error('GET /api/agents/[id]/run24_7', err);
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
    const { run24_7 } = bodySchema.parse(body);
    const agent = await setFileAgentRun24_7(id, session.user.email, run24_7);
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    return NextResponse.json({ run24_7: agent.run24_7 ?? false });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('PATCH /api/agents/[id]/run24_7', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

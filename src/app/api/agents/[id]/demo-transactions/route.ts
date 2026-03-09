import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getDemoTransactionsByAgent } from '@/lib/db/file-demo-transactions';

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
    const list = await getDemoTransactionsByAgent(id, session.user.email);
    return NextResponse.json(list);
  } catch (err) {
    console.error('GET /api/agents/[id]/demo-transactions', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

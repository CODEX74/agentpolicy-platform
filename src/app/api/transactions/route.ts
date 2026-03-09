import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getMergedTransactionsForEmail } from '@/lib/transactions-merged';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactions = await getMergedTransactionsForEmail(session.user.email, 100);
    return NextResponse.json(transactions);
  } catch (err) {
    console.error('GET /api/transactions', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

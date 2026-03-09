import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getFilePoliciesByEmail } from '@/lib/db/file-policies';
import { getDemoSpentToday } from '@/lib/db/file-demo-transactions';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { agentId, transaction } = await req.json();
    if (!agentId || !transaction?.amount || !transaction?.to) {
      return NextResponse.json({ error: 'agentId and transaction (amount, to) required' }, { status: 400 });
    }

    const policies = await getFilePoliciesByEmail(session.user.email, agentId);
    const policy = policies.find((p) => p.agentId === agentId);
    if (!policy) {
      return NextResponse.json({ allowed: true });
    }

    if (policy.dailyLimit > 0) {
      const spentToday = await getDemoSpentToday(agentId, session.user.email);
      const currentDailyTotal = spentToday;
      if (currentDailyTotal + Number(transaction.amount) > policy.dailyLimit) {
        return NextResponse.json({
          allowed: false,
          reason: 'Daily limit exceeded',
        });
      }
    }

    if (policy.maxPerTransaction > 0 && Number(transaction.amount) > policy.maxPerTransaction) {
      return NextResponse.json({
        allowed: false,
        reason: 'Transaction amount exceeds maximum allowed',
      });
    }

    if (policy.timeRestrictions?.enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      if (
        currentHour < policy.timeRestrictions.startHour ||
        currentHour > policy.timeRestrictions.endHour
      ) {
        return NextResponse.json({
          allowed: false,
          reason: 'Outside allowed hours',
        });
      }
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    console.error('Error validating policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

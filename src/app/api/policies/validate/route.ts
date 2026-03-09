import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { getDemoSpentToday } from '@/lib/db/demo-transactions';

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

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const policy = await prisma.policy.findUnique({
      where: { userId_agentId: { userId: user.id, agentId } },
    });
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

    const timeRestrictions = policy.timeRestrictions as { enabled?: boolean; startHour?: number; endHour?: number } | null;
    if (timeRestrictions?.enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      if (
        currentHour < (timeRestrictions.startHour ?? 0) ||
        currentHour > (timeRestrictions.endHour ?? 23)
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

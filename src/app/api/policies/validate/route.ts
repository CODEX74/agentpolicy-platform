import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import dbConnect from '@/lib/db/mongoose';
import Policy from '@/lib/db/models/Policy';
import Transaction from '@/lib/db/models/Transaction';
import User from '@/lib/db/models/User';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { agentId, transaction } = await req.json();
    if (!agentId || !transaction?.amount || !transaction?.to) {
      return NextResponse.json({ error: 'agentId and transaction (amount, to) required' }, { status: 400 });
    }

    const policy = await Policy.findOne({ agentId, userId: user._id });
    if (!policy) {
      return NextResponse.json({ allowed: true });
    }

    if (policy.dailyLimit > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyTotal = await Transaction.aggregate([
        {
          $match: {
            agentId: policy.agentId,
            createdAt: { $gte: today },
            status: 'completed',
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const currentDailyTotal = dailyTotal[0]?.total ?? 0;
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

    if (policy.allowedAddresses?.length) {
      const toLower = String(transaction.to).toLowerCase();
      if (!policy.allowedAddresses.some((a: string) => a.toLowerCase() === toLower)) {
        return NextResponse.json({
          allowed: false,
          reason: 'Destination address not in whitelist',
        });
      }
    }

    if (policy.blockedAddresses?.includes(String(transaction.to).toLowerCase())) {
      return NextResponse.json({
        allowed: false,
        reason: 'Destination address is blocked',
      });
    }

    if (policy.timeRestrictions?.enabled) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      if (
        currentHour < policy.timeRestrictions.startHour ||
        currentHour > policy.timeRestrictions.endHour
      ) {
        return NextResponse.json({
          allowed: false,
          reason: 'Outside allowed hours',
        });
      }
      if (
        policy.timeRestrictions.daysOfWeek?.length &&
        !policy.timeRestrictions.daysOfWeek.includes(currentDay)
      ) {
        return NextResponse.json({
          allowed: false,
          reason: 'Not allowed on this day of week',
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

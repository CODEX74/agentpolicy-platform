import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getDemoTransactionsByEmail } from '@/lib/db/demo-transactions';

const DAYS_BACK = 14;

/** Сумма операций (USDT) по дням из демо-транзакций */
function aggregateByDay(
  transactions: { type: string; amountEth: number; createdAt: string }[]
): Record<string, number> {
  const byDay: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'hold') continue;
    const date = t.createdAt.slice(0, 10);
    byDay[date] = (byDay[date] ?? 0) + t.amountEth;
  }
  return byDay;
}

/** Даты за последние N дней в формате YYYY-MM-DD */
function lastNDays(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(x.getDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const demo = await getDemoTransactionsByEmail(session.user.email);
    const byDay = aggregateByDay(demo);
    const dates = lastNDays(DAYS_BACK);
    const balanceHistory = dates.map((date) => ({
      date,
      balance: byDay[date] ?? 0,
    }));

    return NextResponse.json({ balanceHistory });
  } catch (err) {
    console.error('GET /api/analytics', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

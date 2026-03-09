import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import dbConnect from '@/lib/db/mongoose';
import Wallet from '@/lib/db/models/Wallet';
import Transaction from '@/lib/db/models/Transaction';
import { z } from 'zod';

const sendSchema = z.object({
  fromAddress: z.string(),
  toAddress: z.string(),
  valueWei: z.string(),
  agentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    const User = (await import('@/lib/db/models/User')).default;
    const user = await User.findOne({ email: session.user.email });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    const data = sendSchema.parse(body);

    const wallet = await Wallet.findOne({
      address: data.fromAddress.toLowerCase(),
      userId: user._id,
    });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const { sendTransaction } = await import('@/lib/cdp/transaction');
    const result = await sendTransaction({
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      valueWei: data.valueWei,
    });

    await Transaction.create({
      userId: user._id,
      agentId: data.agentId ?? wallet.agentId,
      walletId: wallet._id,
      type: 'transfer',
      amount: Number(data.valueWei) / 1e18,
      currency: 'USDT',
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      txHash: result.txHash,
      status: 'completed',
    });

    return NextResponse.json({ txHash: result.txHash });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('POST /api/wallets/transaction', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

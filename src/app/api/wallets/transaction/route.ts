import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getFileWalletByAddress } from '@/lib/db/file-wallets';
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

    const body = await req.json();
    const data = sendSchema.parse(body);

    const wallet = await getFileWalletByAddress(
      data.fromAddress.toLowerCase(),
      session.user.email
    );
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const { sendTransaction } = await import('@/lib/cdp/transaction');
    const result = await sendTransaction({
      fromAddress: data.fromAddress,
      toAddress: data.toAddress,
      valueWei: data.valueWei,
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

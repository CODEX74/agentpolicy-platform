import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { decryptPrivateKey } from '@/lib/wallets/serverKey';

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

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const wallet = await prisma.wallet.findUnique({
      where: { userId_address: { userId: user.id, address: data.fromAddress.toLowerCase() } },
    });
    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    // If wallet was created via CDP and we have cdpWalletId, prefer CDP send (server signer).
    if (wallet.cdpWalletId) {
      const { sendTransaction } = await import('@/lib/cdp/transaction');
      const result = await sendTransaction({
        fromAddress: data.fromAddress,
        toAddress: data.toAddress,
        valueWei: data.valueWei,
        networkId: wallet.networkId,
      });
      return NextResponse.json({ txHash: result.txHash });
    }

    // If wallet has a server-side private key, sign and send directly via RPC without CDP.
    if (wallet.serverPrivateKey) {
      const privateKey = decryptPrivateKey(wallet.serverPrivateKey);
      const account = privateKeyToAccount(privateKey);

      const networkId = wallet.networkId || process.env.NETWORK_ID || 'base-sepolia';
      const rpcUrl =
        networkId === 'base-mainnet'
          ? 'https://mainnet.base.org'
          : networkId === 'base-sepolia'
            ? 'https://sepolia.base.org'
            : process.env.BASE_RPC_URL ?? 'https://sepolia.base.org';

      const client = createWalletClient({
        account,
        transport: http(rpcUrl),
      });

      const txHash = await client.sendTransaction({
        to: data.toAddress as Address,
        value: BigInt(data.valueWei),
      });

      return NextResponse.json({ txHash });
    }

    return NextResponse.json(
      {
        error:
          'Wallet is not configured for server-side sending. It must be created via CDP or imported with a private key.',
      },
      { status: 400 },
    );
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('POST /api/wallets/transaction', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { createWalletClient, http, type Address } from 'viem';
import { base, baseSepolia, mainnet } from 'viem/chains';
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
      const { rpcUrl, chain } =
        networkId === 'base-mainnet'
          ? {
              rpcUrl: 'https://mainnet.base.org',
              chain: base,
            }
          : networkId === 'base-sepolia'
            ? {
                rpcUrl: 'https://sepolia.base.org',
                chain: baseSepolia,
              }
            : networkId === 'ethereum-mainnet'
              ? {
                  rpcUrl:
                    process.env.ETHEREUM_RPC_URL ??
                    'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
                  chain: mainnet,
                }
              : {
                  rpcUrl: process.env.BASE_RPC_URL ?? 'https://sepolia.base.org',
                  chain: baseSepolia,
                };

      const client = createWalletClient({
        account,
        chain,
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

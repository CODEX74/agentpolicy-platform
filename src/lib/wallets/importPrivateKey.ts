import { prisma } from '@/lib/db/prisma';
import { encryptPrivateKey } from '@/lib/wallets/serverKey';
import { privateKeyToAccount } from 'viem/accounts';

export interface ImportPrivateKeyParams {
  userId: string;
  privateKey: string;
  agentId?: string;
  networkId?: string;
}

export async function importPrivateKeyForUser(params: ImportPrivateKeyParams) {
  const { userId, privateKey, agentId, networkId } = params;

  const normalizedKey = privateKey.trim().toLowerCase().startsWith('0x')
    ? (privateKey.trim().toLowerCase() as `0x${string}`)
    : (`0x${privateKey.trim().toLowerCase()}` as `0x${string}`);

  const account = privateKeyToAccount(normalizedKey);
  const accountAddress = account.address.toLowerCase();

  const encryptedKey = encryptPrivateKey(normalizedKey);

  const wallet = await prisma.wallet.upsert({
    where: {
      userId_address: {
        userId,
        address: accountAddress,
      },
    },
    update: {
      serverPrivateKey: encryptedKey,
      networkId: networkId ?? process.env.NETWORK_ID ?? 'base-sepolia',
      agentId: agentId ?? undefined,
    },
    create: {
      userId,
      address: accountAddress,
      networkId: networkId ?? process.env.NETWORK_ID ?? 'base-sepolia',
      agentId: agentId ?? undefined,
      serverPrivateKey: encryptedKey,
    },
  });

  if (agentId) {
    await prisma.agent.updateMany({
      where: { id: agentId, userId },
      data: {
        walletId: wallet.id,
        walletAddress: wallet.address,
        realWalletId: wallet.id,
        realWalletAddress: wallet.address,
        realWalletNetwork: wallet.networkId ?? networkId ?? process.env.NETWORK_ID ?? 'base-sepolia',
        realWalletAsset: 'USDC',
      },
    });
  }

  return wallet;
}


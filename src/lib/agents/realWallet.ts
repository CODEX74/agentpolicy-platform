import { prisma } from '@/lib/db/prisma';
import { createAgentWallet, getWalletBalance } from '@/lib/cdp/wallet';
import { sendTransaction } from '@/lib/cdp/transaction';
import { logger } from '@/lib/utils/logger';

export interface RealTradeParams {
  agentId: string;
  userId: string;
  asset: string;
  amountUsd: number;
  toAddress: string;
}

export async function createRealAgentWallet(userId: string, agentId: string) {
  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
  if (!agent) {
    throw new Error('Agent not found');
  }
  if (agent.realWalletAddress) {
    return agent;
  }

  const { address, walletId } = await createAgentWallet();

  const updated = await prisma.agent.update({
    where: { id: agentId },
    data: {
      realWalletId: walletId ?? null,
      realWalletAddress: address,
      realWalletNetwork: process.env.NETWORK_ID ?? 'base-sepolia',
      realWalletAsset: 'USDC',
    },
  });

  return updated;
}

export async function getRealWalletBalance(agentId: string, userId: string) {
  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
  if (!agent?.realWalletAddress) {
    return { address: agent?.realWalletAddress ?? null, balanceWei: '0' };
  }
  const networkId = agent.realWalletNetwork ?? undefined;
  const balanceWei = await getWalletBalance(agent.realWalletAddress, networkId);
  return { address: agent.realWalletAddress, balanceWei };
}

export async function sendRealTrade(params: RealTradeParams) {
  const agent = await prisma.agent.findFirst({
    where: { id: params.agentId, userId: params.userId },
  });
  if (!agent) {
    throw new Error('Agent not found');
  }
  if (!agent.realTradingEnabled || !agent.realWalletAddress) {
    throw new Error('Real trading is disabled or wallet not configured');
  }

  // TODO: конвертацию amountUsd -> valueWei пока оставляем простой заглушкой (1 USDC ~ 1e6 единиц).
  const valueWei = BigInt(Math.floor(params.amountUsd * 1_000_000)).toString();

  try {
    const networkId = agent.realWalletNetwork ?? 'base';
    const { txHash } = await sendTransaction({
      fromAddress: agent.realWalletAddress,
      toAddress: params.toAddress,
      valueWei,
      networkId,
    });

    await prisma.realTransaction.create({
      data: {
        agentId: params.agentId,
        userId: params.userId,
        txHash,
        asset: params.asset,
        amountUsd: params.amountUsd,
        side: 'buy',
        network: agent.realWalletNetwork ?? 'base',
        walletAddress: agent.realWalletAddress,
      },
    });

    return { txHash };
  } catch (err) {
    logger.error('sendRealTrade failed', err);
    throw err;
  }
}


import { getCdpClient } from './client';
import { logger } from '@/lib/utils/logger';

export interface CreateWalletResult {
  address: string;
  walletId?: string;
}

export async function createAgentWallet(): Promise<CreateWalletResult> {
  try {
    const agentKit = await getCdpClient();
    const walletProvider = (agentKit as { getWalletProvider?: () => unknown }).getWalletProvider?.();

    if (!walletProvider || typeof (walletProvider as { createWallet?: () => Promise<{ address: string }> }).createWallet !== 'function') {
      throw new Error('Wallet provider does not support createWallet');
    }

    const wallet = await (walletProvider as { createWallet: () => Promise<{ address: string; id?: string }> }).createWallet();
    return {
      address: wallet.address,
      walletId: wallet.id,
    };
  } catch (err) {
    logger.error('createAgentWallet failed', err);
    throw err;
  }
}

export async function getWalletBalance(address: string): Promise<string> {
  try {
    const agentKit = await getCdpClient();
    const walletProvider = (agentKit as { getWalletProvider?: () => unknown }).getWalletProvider?.();
    if (!walletProvider || typeof (walletProvider as { getBalance?: (addr: string) => Promise<{ value: string }> }).getBalance !== 'function') {
      return '0';
    }
    const balance = await (walletProvider as { getBalance: (addr: string) => Promise<{ value: string }> }).getBalance(address);
    return balance?.value ?? '0';
  } catch (err) {
    logger.error('getWalletBalance failed', err);
    return '0';
  }
}

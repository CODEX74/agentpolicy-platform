/**
 * Agent wallet creation and balance via CDP REST (no agentkit/cdp-sdk ESM).
 */

import * as rest from './rest';
import { logger } from '@/lib/utils/logger';

export interface CreateWalletResult {
  address: string;
  walletId?: string;
}

export async function createAgentWallet(): Promise<CreateWalletResult> {
  try {
    const networkId = process.env.NETWORK_ID ?? 'base-sepolia';
    const { walletId, address } = await rest.createWallet(networkId);
    return { address, walletId };
  } catch (err) {
    logger.error('createAgentWallet failed', err);
    throw err;
  }
}

export async function getWalletBalance(address: string, networkId?: string): Promise<string> {
  try {
    const network = networkId ?? process.env.NETWORK_ID ?? 'base-sepolia';
    return await rest.getBalanceByAddress(address, network);
  } catch (err) {
    logger.error('getWalletBalance failed', err);
    return '0';
  }
}

/**
 * Agent wallet creation and balance via CDP REST (no agentkit/cdp-sdk ESM).
 */

import * as rest from './rest';
import { logger } from '@/lib/utils/logger';

export interface CreateWalletResult {
  address: string;
  walletId?: string;
}

function isRateLimitError(err: unknown): err is Error & { code?: string; retryAfterSeconds?: number } {
  const anyErr = err as { code?: string } | null | undefined;
  return !!anyErr && anyErr.code === 'CDP_RATE_LIMIT';
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createAgentWallet(): Promise<CreateWalletResult> {
  try {
    const networkId = process.env.NETWORK_ID ?? 'base-sepolia';
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { walletId, address } = await rest.createWallet(networkId);
        return { address, walletId };
      } catch (err) {
        lastError = err;
        if (!isRateLimitError(err) || attempt === maxAttempts) {
          break;
        }

        const retryAfterSeconds =
          (err as { retryAfterSeconds?: number }).retryAfterSeconds ?? undefined;
        const baseDelayMs = 1000;
        const backoffFactor = 2 ** (attempt - 1);
        const delayMs = retryAfterSeconds
          ? retryAfterSeconds * 1000
          : baseDelayMs * backoffFactor;

        logger.error('createAgentWallet rate limited, retrying', {
          attempt,
          maxAttempts,
          delayMs,
        });
        await sleep(delayMs);
        continue;
      }
    }

    throw lastError ?? new Error('Failed to create CDP wallet');
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

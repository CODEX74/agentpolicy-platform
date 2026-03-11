/**
 * Send transaction via CDP REST (no agentkit/cdp-sdk ESM).
 */

import * as rest from './rest';
import { logger } from '@/lib/utils/logger';

export interface SendTransactionParams {
  fromAddress: string;
  toAddress: string;
  valueWei: string;
  data?: string;
  networkId?: string;
}

export async function sendTransaction(params: SendTransactionParams): Promise<{ txHash: string }> {
  try {
    const networkId = params.networkId ?? process.env.NETWORK_ID ?? 'base-sepolia';
    return await rest.sendTransaction({
      networkId,
      fromAddress: params.fromAddress,
      toAddress: params.toAddress,
      valueWei: params.valueWei,
      data: params.data,
    });
  } catch (err) {
    logger.error('sendTransaction failed', err);
    throw err;
  }
}

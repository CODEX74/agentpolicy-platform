import { getCdpClient } from './client';
import { logger } from '@/lib/utils/logger';

export interface SendTransactionParams {
  fromAddress: string;
  toAddress: string;
  valueWei: string;
  data?: string;
}

export async function sendTransaction(params: SendTransactionParams): Promise<{ txHash: string }> {
  try {
    const agentKit = await getCdpClient();
    const walletProvider = (agentKit as { getWalletProvider?: () => unknown }).getWalletProvider?.();

    if (!walletProvider || typeof (walletProvider as { sendTransaction?: (params: unknown) => Promise<{ hash: string }> }).sendTransaction !== 'function') {
      throw new Error('Wallet provider does not support sendTransaction');
    }

    const result = await (walletProvider as { sendTransaction: (params: unknown) => Promise<{ hash: string }> }).sendTransaction({
      from: params.fromAddress,
      to: params.toAddress,
      value: BigInt(params.valueWei),
      data: params.data,
    });

    return { txHash: result.hash };
  } catch (err) {
    logger.error('sendTransaction failed', err);
    throw err;
  }
}

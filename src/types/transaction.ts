import type { Types } from 'mongoose';

export type TransactionType = 'transfer' | 'swap' | 'nft' | 'contract' | 'receive';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'rejected';

export interface ITransaction {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  agentId?: Types.ObjectId | null;
  walletId: Types.ObjectId;
  type: TransactionType;
  amount: number;
  currency: string;
  fromAddress?: string | null;
  toAddress?: string | null;
  txHash?: string | null;
  status: TransactionStatus;
  policyValidated?: boolean | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

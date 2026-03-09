import type { Types } from 'mongoose';

export interface IWallet {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  agentId?: Types.ObjectId | null;
  address: string;
  networkId: string;
  cdpWalletId?: string | null;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

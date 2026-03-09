export interface IWallet {
  _id: string;
  userId: string;
  agentId?: string | null;
  address: string;
  networkId: string;
  cdpWalletId?: string | null;
  isDefault: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

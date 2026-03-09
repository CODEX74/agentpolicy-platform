import type { Types } from 'mongoose';

export interface IAgent {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  description?: string;
  moltbookId?: string | null;
  walletId?: Types.ObjectId | null;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentCreateInput {
  name: string;
  description?: string;
  moltbookId?: string;
}

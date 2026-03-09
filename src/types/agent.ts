export interface IAgent {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  moltbookId?: string | null;
  walletId?: string | null;
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

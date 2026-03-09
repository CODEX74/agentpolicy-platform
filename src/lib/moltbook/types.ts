export interface MoltbookAgent {
  id: string;
  name: string;
  description?: string;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface MoltbookAgentsResponse {
  agents: MoltbookAgent[];
  total?: number;
}

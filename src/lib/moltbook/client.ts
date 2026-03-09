import axios from 'axios';
import type { MoltbookAgent, MoltbookAgentsResponse } from './types';

export class MoltbookClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.MOLTBOOK_API_KEY ?? '';
    this.baseUrl = process.env.MOLTBOOK_API_URL ?? 'https://api.moltbook.com/v1';
  }

  async getUserAgents(userToken: string): Promise<MoltbookAgentsResponse> {
    try {
      const response = await axios.get<MoltbookAgentsResponse>(`${this.baseUrl}/agents`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'X-API-Key': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching agents from Moltbook:', error);
      throw error;
    }
  }

  async getAgentDetails(agentId: string, userToken: string): Promise<MoltbookAgent> {
    try {
      const response = await axios.get<MoltbookAgent>(`${this.baseUrl}/agents/${agentId}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
          'X-API-Key': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching agent details from Moltbook:', error);
      throw error;
    }
  }
}

export const moltbookClient = new MoltbookClient();

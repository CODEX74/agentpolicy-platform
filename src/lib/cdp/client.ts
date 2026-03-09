import { AgentKit } from '@coinbase/agentkit';
import { logger } from '@/lib/utils/logger';

let agentKitInstance: AgentKit | null = null;

export async function getCdpClient(): Promise<AgentKit> {
  if (agentKitInstance) {
    return agentKitInstance;
  }

  const apiKeyName = process.env.CDP_API_KEY_NAME;
  const apiKeyPrivateKey = process.env.CDP_API_KEY_PRIVATE_KEY;

  if (!apiKeyName || !apiKeyPrivateKey) {
    throw new Error(
      'CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY must be set in environment'
    );
  }

  try {
    agentKitInstance = await AgentKit.from({
      cdpApiKeyId: apiKeyName,
      cdpApiKeySecret: apiKeyPrivateKey,
    });
    return agentKitInstance;
  } catch (err) {
    logger.error('Failed to initialize CDP client', err);
    throw err;
  }
}

export async function initializeCdpClient(): Promise<AgentKit> {
  return getCdpClient();
}

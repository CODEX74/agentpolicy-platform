import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { logger } from '@/lib/utils/logger';

export interface PolicySuggestionInput {
  agentName: string;
  agentDescription?: string;
  currentPolicy?: {
    dailyLimit?: number;
    weeklyLimit?: number;
    maxPerTransaction?: number;
    allowedOperations?: string[];
  };
}

export interface PolicySuggestion {
  dailyLimit: number;
  weeklyLimit: number;
  maxPerTransaction: number;
  allowedOperations: string[];
  reasoning: string;
}

export async function getPolicySuggestions(
  input: PolicySuggestionInput
): Promise<PolicySuggestion | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY not set, skipping policy suggestions');
    return null;
  }

  try {
    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      prompt: `You are a financial policy advisor for AI agents. Suggest safe default policy limits (in USDT) for an agent.
Agent name: ${input.agentName}
Agent description: ${input.agentDescription ?? 'Not provided'}
Current policy (if any): ${JSON.stringify(input.currentPolicy ?? {})}

Respond with ONLY a valid JSON object (no markdown, no explanation) with keys: dailyLimit (number), weeklyLimit (number), maxPerTransaction (number), allowedOperations (array of: "transfer", "swap", "nft", "contract"), reasoning (string, short). Use decimals for USDT amounts, e.g. 100, 500.`,
    });

    const parsed = JSON.parse(text.trim()) as PolicySuggestion;
    if (
      typeof parsed.dailyLimit === 'number' &&
      typeof parsed.weeklyLimit === 'number' &&
      typeof parsed.maxPerTransaction === 'number' &&
      Array.isArray(parsed.allowedOperations)
    ) {
      return parsed;
    }
    return null;
  } catch (err) {
    logger.error('getPolicySuggestions failed', err);
    return null;
  }
}

import { sendLogEmail } from './email';

export const logger = {
  info: (...args: unknown[]) => {
    console.log('[AgentWallet]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[AgentWallet]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[AgentWallet]', ...args);
    // fire-and-forget email with error details
    const text = args
      .map((a) => {
        try {
          return typeof a === 'string' ? a : JSON.stringify(a);
        } catch {
          return String(a);
        }
      })
      .join(' ');
    void sendLogEmail('[AgentWallet] error', text);
  },
};


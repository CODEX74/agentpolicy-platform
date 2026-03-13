export const logger = {
  info: (...args: unknown[]) => {
    console.log('[AgentWallet]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[AgentWallet]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[AgentWallet]', ...args);
  },
};

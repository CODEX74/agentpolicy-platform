const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.log('[AgentWallet]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[AgentWallet]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[AgentWallet]', ...args);
  },
};

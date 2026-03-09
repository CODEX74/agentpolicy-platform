const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.log('[AgentPolicy]', ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn('[AgentPolicy]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[AgentPolicy]', ...args);
  },
};

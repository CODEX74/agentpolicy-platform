export const CHAINS = {
  'base-sepolia': {
    id: 84532,
    name: 'Base Sepolia',
    isTestnet: true,
  },
  'base-mainnet': {
    id: 8453,
    name: 'Base',
    isTestnet: false,
  },
} as const;

export type ChainId = keyof typeof CHAINS;

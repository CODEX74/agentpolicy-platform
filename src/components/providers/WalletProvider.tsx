'use client';

import { createContext, useContext, type ReactNode } from 'react';

interface WalletContextValue {
  address: string | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const value: WalletContextValue = {
    address: null,
    isConnected: false,
    connect: () => {},
    disconnect: () => {},
  };
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  return ctx ?? { address: null, isConnected: false, connect: () => {}, disconnect: () => {} };
}

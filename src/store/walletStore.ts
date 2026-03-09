import { create } from 'zustand';

interface WalletStore {
  selectedAddress: string | null;
  setSelectedAddress: (address: string | null) => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  selectedAddress: null,
  setSelectedAddress: (address) => set({ selectedAddress: address }),
}));

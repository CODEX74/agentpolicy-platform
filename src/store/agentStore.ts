import { create } from 'zustand';

interface AgentStore {
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  selectedAgentId: null,
  setSelectedAgentId: (id) => set({ selectedAgentId: id }),
}));

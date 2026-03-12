'use client';

import { useState, useEffect } from 'react';

interface BalancePoint {
  date: string;
  balance: number;
}

interface AgentBalance {
  agentId: string;
  name: string;
  balanceEth: number;
}

interface AssetSlice {
  asset: string;
  value: number;
}

interface AssetAllocationPerAgent {
  agentId: string;
  name: string;
  assets: AssetSlice[];
}

interface PnlRecord {
  agentId: string;
  name: string;
  pnlTotal: number;
}

interface BuyPoint {
  agentId: string;
  name: string;
  date: string;
  buyAmount: number;
}

export function useRealAnalytics() {
  const [balanceHistory, setBalanceHistory] = useState<BalancePoint[]>([]);
  const [agentBalances, setAgentBalances] = useState<AgentBalance[]>([]);
  const [assetAllocationByAgent, setAssetAllocationByAgent] = useState<AssetAllocationPerAgent[]>([]);
  const [pnlByAgent, setPnlByAgent] = useState<PnlRecord[]>([]);
  const [buysByAgentOverTime, setBuysByAgentOverTime] = useState<BuyPoint[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/real')
      .then((res) =>
        res.ok
          ? res.json()
          : {
              balanceHistory: [],
              agentBalances: [],
              assetAllocationByAgent: [],
              pnlByAgent: [],
              buysByAgentOverTime: [],
            }
      )
      .then((data) => {
        setBalanceHistory(Array.isArray(data.balanceHistory) ? data.balanceHistory : []);
        setAgentBalances(Array.isArray(data.agentBalances) ? data.agentBalances : []);
        setAssetAllocationByAgent(
          Array.isArray(data.assetAllocationByAgent) ? data.assetAllocationByAgent : []
        );
        setPnlByAgent(Array.isArray(data.pnlByAgent) ? data.pnlByAgent : []);
        setBuysByAgentOverTime(
          Array.isArray(data.buysByAgentOverTime) ? data.buysByAgentOverTime : []
        );
      })
      .catch(() => {
        setBalanceHistory([]);
        setAgentBalances([]);
        setAssetAllocationByAgent([]);
        setPnlByAgent([]);
        setBuysByAgentOverTime([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return {
    balanceHistory,
    agentBalances,
    assetAllocationByAgent,
    pnlByAgent,
    buysByAgentOverTime,
    isLoading,
  };
}


'use client';

import { useState, useEffect } from 'react';

export function useAnalytics() {
  const [balanceHistory, setBalanceHistory] = useState<{ date: string; balance: number }[]>([]);
  const [agentBalances, setAgentBalances] = useState<
    { agentId: string; name: string; demoBalance: number }[]
  >([]);
  const [assetAllocation, setAssetAllocation] = useState<
    { asset: string; valueUsd: number }[]
  >([]);
  const [pnlByAgent, setPnlByAgent] = useState<
    { agentId: string; name: string; pnlTotal: number }[]
  >([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) =>
        res.ok
          ? res.json()
          : { balanceHistory: [], agentBalances: [], assetAllocation: [], pnlByAgent: [] }
      )
      .then((data) => {
        setBalanceHistory(Array.isArray(data.balanceHistory) ? data.balanceHistory : []);
        setAgentBalances(Array.isArray(data.agentBalances) ? data.agentBalances : []);
        setAssetAllocation(Array.isArray(data.assetAllocation) ? data.assetAllocation : []);
        setPnlByAgent(Array.isArray(data.pnlByAgent) ? data.pnlByAgent : []);
      })
      .catch(() => {
        setBalanceHistory([]);
        setAgentBalances([]);
        setAssetAllocation([]);
        setPnlByAgent([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return { balanceHistory, agentBalances, assetAllocation, pnlByAgent, isLoading };
}

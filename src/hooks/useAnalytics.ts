'use client';

import { useState, useEffect } from 'react';

export function useAnalytics() {
  const [balanceHistory, setBalanceHistory] = useState<{ date: string; balance: number }[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics')
      .then((res) => (res.ok ? res.json() : { balanceHistory: [] }))
      .then((data) => setBalanceHistory(Array.isArray(data.balanceHistory) ? data.balanceHistory : []))
      .catch(() => setBalanceHistory([]))
      .finally(() => setLoading(false));
  }, []);

  return { balanceHistory, isLoading };
}

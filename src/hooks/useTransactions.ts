'use client';

import { useState, useEffect } from 'react';

export function useTransactions() {
  const [transactions, setTransactions] = useState<unknown[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/transactions')
      .then((res) => (res.ok ? res.json() : []))
      .then(setTransactions)
      .finally(() => setLoading(false));
  }, []);

  return { transactions, isLoading };
}

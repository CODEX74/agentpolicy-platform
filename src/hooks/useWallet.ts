'use client';

import { useState, useEffect } from 'react';

export function useWalletBalance(address: string | null) {
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setLoading] = useState(!!address);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/wallets/balance?address=${encodeURIComponent(address)}`)
      .then((res) => (res.ok ? res.json() : { balance: null }))
      .then((j) => setBalance(j?.balance ?? null))
      .finally(() => setLoading(false));
  }, [address]);

  return { balance, isLoading };
}

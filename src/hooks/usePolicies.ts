'use client';

import { useState, useEffect, useCallback } from 'react';

export function usePolicies(agentId?: string | null) {
  const [policies, setPolicies] = useState<unknown[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    const url = agentId ? `/api/policies?agentId=${agentId}` : '/api/policies';
    setLoading(true);
    fetch(url)
      .then((res) => (res.ok ? res.json() : []))
      .then(setPolicies)
      .finally(() => setLoading(false));
  }, [agentId]);

  const savePolicy = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch('/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to save');
    return res.json();
  }, []);

  return { policies, isLoading, savePolicy };
}

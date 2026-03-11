'use client';

import { useState, useEffect, useCallback } from 'react';

export function useAgents() {
  const [agents, setAgents] = useState<unknown[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/agents');
      if (!res.ok) throw new Error('Failed to fetch agents');
      const data = await res.json();
      setAgents(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createAgent = useCallback(
    async (body: {
      name: string;
      description?: string;
      moltbookId?: string;
      agentType?: 'INVESTOR' | 'TRADER';
      mode?: 'DEMO' | 'WALLET';
    }) => {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          payload && typeof payload.error === 'string'
            ? payload.error
            : 'Failed to create agent';
        throw new Error(message);
      }
      const created = payload ?? {};
      setAgents((prev) => [created, ...prev]);
      return created;
    },
    []
  );

  return { agents, isLoading, error, refetch, createAgent };
}

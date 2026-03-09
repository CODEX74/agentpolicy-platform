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

  const createAgent = useCallback(async (body: { name: string; description?: string; moltbookId?: string }) => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to create');
    const created = await res.json();
    setAgents((prev) => [created, ...prev]);
    return created;
  }, []);

  return { agents, isLoading, error, refetch, createAgent };
}

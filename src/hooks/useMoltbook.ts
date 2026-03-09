'use client';

import { useState, useEffect } from 'react';

export function useMoltbookAgents(token: string | null) {
  const [agents, setAgents] = useState<unknown[]>([]);
  const [isLoading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setAgents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/moltbook/agents?token=${encodeURIComponent(token)}`)
      .then((res) => (res.ok ? res.json() : { agents: [] }))
      .then((data) => setAgents(data?.agents ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  return { agents, isLoading };
}

'use client';

import { AgentCard } from './AgentCard';
import type { IAgent } from '@/types/agent';

interface AgentListProps {
  agents: (IAgent & { walletId?: { address?: string } })[];
}

export function AgentList({ agents }: AgentListProps) {
  if (agents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
        <p className="text-zinc-600 dark:text-zinc-400">Агентов пока нет.</p>
        <p className="mt-1 text-sm text-zinc-500">Создайте или подключите агента.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={String(agent._id)} agent={agent} />
      ))}
    </div>
  );
}

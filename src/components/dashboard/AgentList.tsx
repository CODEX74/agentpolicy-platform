'use client';

import { AgentCard } from './AgentCard';
import type { IAgent } from '@/types/agent';
import { useLang } from '@/contexts/LanguageContext';
import type { Lang } from '@/contexts/LanguageContext';

const t: Record<Lang, { empty: string; hint: string }> = {
  ru: { empty: 'Агентов пока нет.', hint: 'Создайте или подключите агента.' },
  en: { empty: 'No agents yet.', hint: 'Create or connect an agent.' },
};

interface AgentListProps {
  agents: (IAgent & { walletId?: { address?: string } })[];
}

export function AgentList({ agents }: AgentListProps) {
  const lang = useLang();
  const text = t[lang];

  if (agents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-700">
        <p className="text-zinc-600 dark:text-zinc-400">{text.empty}</p>
        <p className="mt-1 text-sm text-zinc-500">{text.hint}</p>
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

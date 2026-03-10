'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bot } from 'lucide-react';
import { formatAddress } from '@/lib/utils/format';
import { useLang, withLang } from '@/contexts/LanguageContext';
import type { Lang } from '@/contexts/LanguageContext';

const t: Record<Lang, { active: string; inactive: string; settings: string }> = {
  ru: { active: 'Активен', inactive: 'Неактивен', settings: 'Настроить' },
  en: { active: 'Active', inactive: 'Inactive', settings: 'Settings' },
};

interface AgentCardProps {
  agent: {
    _id: unknown;
    name: string;
    description?: string;
    isActive: boolean;
    walletId?: { address?: string };
  };
}

export function AgentCard({ agent }: AgentCardProps) {
  const lang = useLang();
  const text = t[lang];
  const address = agent.walletId?.address;
  const href = withLang(`/dashboard/agents/${agent._id}`, lang);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
            <Bot className="h-6 w-6 text-zinc-600 dark:text-zinc-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{agent.name}</h3>
            {agent.description && (
              <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">{agent.description}</p>
            )}
            {address && (
              <p className="mt-2 font-mono text-xs text-zinc-500">{formatAddress(address)}</p>
            )}
            <p className="mt-1 text-xs text-zinc-400">{agent.isActive ? text.active : text.inactive}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button href={href} variant="outline" size="sm">
          {text.settings}
        </Button>
      </CardFooter>
    </Card>
  );
}

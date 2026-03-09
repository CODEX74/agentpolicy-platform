'use client';

import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bot } from 'lucide-react';
import { formatAddress } from '@/lib/utils/format';

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
  const address = agent.walletId?.address;

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
            <p className="mt-1 text-xs text-zinc-400">{agent.isActive ? 'Активен' : 'Неактивен'}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button href={`/dashboard/agents/${agent._id}`} variant="outline" size="sm">
          Настроить
        </Button>
      </CardFooter>
    </Card>
  );
}

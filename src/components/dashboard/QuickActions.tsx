'use client';

import { Plus, Bot, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function QuickActions({ hasOpenAiKey = true }: { hasOpenAiKey?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      {hasOpenAiKey ? (
        <Button href="/dashboard/agents/create" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Добавить агента
        </Button>
      ) : (
        <Button size="sm" disabled title="Укажите OpenAI (ChatGPT) API key в Настройках">
          <Plus className="mr-2 h-4 w-4" />
          Добавить агента
        </Button>
      )}
      <Button href="/dashboard/agents" variant="outline" size="sm">
        <Bot className="mr-2 h-4 w-4" />
        Агенты
      </Button>
      <Button href="/dashboard/transactions" variant="outline" size="sm">
        <Wallet className="mr-2 h-4 w-4" />
        Транзакции
      </Button>
    </div>
  );
}

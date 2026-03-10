'use client';

import { Plus, Bot, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useLang, withLang } from '@/contexts/LanguageContext';

const t = {
  ru: { addAgent: 'Добавить агента', addAgentTitle: 'Укажите OpenAI (ChatGPT) API key в Настройках', agents: 'Агенты', transactions: 'Транзакции' },
  en: { addAgent: 'Add agent', addAgentTitle: 'Add your OpenAI (ChatGPT) API key in Settings', agents: 'Agents', transactions: 'Transactions' },
};

export function QuickActions({ hasOpenAiKey = true }: { hasOpenAiKey?: boolean }) {
  const lang = useLang();
  const text = t[lang];

  return (
    <div className="flex flex-wrap gap-3">
      {hasOpenAiKey ? (
        <Button href={withLang('/dashboard/agents/create', lang)} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {text.addAgent}
        </Button>
      ) : (
        <Button size="sm" disabled title={text.addAgentTitle}>
          <Plus className="mr-2 h-4 w-4" />
          {text.addAgent}
        </Button>
      )}
      <Button href={withLang('/dashboard/agents', lang)} variant="outline" size="sm">
        <Bot className="mr-2 h-4 w-4" />
        {text.agents}
      </Button>
      <Button href={withLang('/dashboard/transactions', lang)} variant="outline" size="sm">
        <Wallet className="mr-2 h-4 w-4" />
        {text.transactions}
      </Button>
    </div>
  );
}

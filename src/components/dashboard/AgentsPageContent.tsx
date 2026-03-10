'use client';

import { AgentList } from '@/components/dashboard/AgentList';
import { Button } from '@/components/ui/Button';
import { useLang, withLang } from '@/contexts/LanguageContext';

const t = {
  ru: {
    title: 'Агенты',
    addAgent: 'Добавить агента',
    noKeyMessage: 'Чтобы создавать агентов, укажите OpenAI (ChatGPT) API key в Настройках.',
    settings: 'Настройки',
  },
  en: {
    title: 'Agents',
    addAgent: 'Add agent',
    noKeyMessage: 'To create agents, add your OpenAI (ChatGPT) API key in Settings.',
    settings: 'Settings',
  },
};

export function AgentsPageContent({
  agents,
  hasOpenAiKey,
}: {
  agents: { _id: string; name: string; description: string; isActive: boolean; walletId?: string; walletAddress?: string; demoBalance?: number; initialDemoBalance?: number; run24_7?: boolean; createdAt: string; updatedAt: string }[];
  hasOpenAiKey: boolean;
}) {
  const lang = useLang();
  const text = t[lang];

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{text.title}</h1>
        {hasOpenAiKey ? (
          <Button href={withLang('/dashboard/agents/create', lang)}>{text.addAgent}</Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <p className="text-sm text-amber-600 dark:text-amber-400">{text.noKeyMessage}</p>
            <Button href={withLang('/dashboard/settings', lang)} variant="outline">
              {text.settings}
            </Button>
          </div>
        )}
      </div>
      <div className="mt-6">
        <AgentList agents={agents as never[]} />
      </div>
    </>
  );
}

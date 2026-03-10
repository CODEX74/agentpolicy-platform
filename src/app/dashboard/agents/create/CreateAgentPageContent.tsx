'use client';

import { CreateAgentForm } from './CreateAgentForm';
import { Button } from '@/components/ui/Button';
import { useLang, withLang } from '@/contexts/LanguageContext';

const t = {
  ru: {
    title: 'Добавить агента',
    noKeyMessage: 'Чтобы создавать агентов, укажите OpenAI (ChatGPT) API key в Настройках.',
    goToSettings: 'Перейти в Настройки',
  },
  en: {
    title: 'Add agent',
    noKeyMessage: 'To create agents, add your OpenAI (ChatGPT) API key in Settings.',
    goToSettings: 'Go to Settings',
  },
};

export function CreateAgentPageContent({ hasOpenAiKey }: { hasOpenAiKey: boolean }) {
  const lang = useLang();
  const text = t[lang];

  if (!hasOpenAiKey) {
    return (
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">{text.title}</h1>
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-200">{text.noKeyMessage}</p>
          <Button href={withLang('/dashboard/settings', lang)} variant="outline" className="mt-4">
            {text.goToSettings}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold">{text.title}</h1>
      <CreateAgentForm />
    </div>
  );
}

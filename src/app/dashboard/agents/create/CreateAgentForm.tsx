'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { useLang, withLang } from '@/contexts/LanguageContext';
import type { Lang } from '@/contexts/LanguageContext';

const schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  agentType: z.enum(['INVESTOR', 'TRADER']),
  mode: z.enum(['DEMO', 'WALLET']),
});

type FormData = z.infer<typeof schema>;

const t = {
  ru: {
    name: 'Название',
    namePlaceholder: 'Мой агент',
    description: 'Описание (необязательно)',
    descriptionPlaceholder: 'Описание агента',
    agentType: 'Тип агента',
    investor: 'Инвестор (10+ дней)',
    trader: 'Трейдер (5–30 минут)',
    typeHint: 'Инвестор покупает на долгий срок. Трейдер ищет быстрые сделки и продаёт по цели.',
    mode: 'Режим работы агента',
    modeDemo: 'Демо-баланс',
    modeWallet: 'Подключить свой кошелёк',
    modeHint: 'В демо-режиме агент тратит виртуальный баланс. Подключение реального кошелька (CDP) доступно через API и интеграции.',
    error: 'Ошибка создания агента',
    creating: 'Создание...',
    submit: 'Создать',
  },
  en: {
    name: 'Name',
    namePlaceholder: 'My agent',
    description: 'Description (optional)',
    descriptionPlaceholder: 'Agent description',
    agentType: 'Agent type',
    investor: 'Investor (10+ days)',
    trader: 'Trader (5–30 min)',
    typeHint: 'Investor buys for the long term. Trader looks for quick trades and sells at target.',
    mode: 'Agent mode',
    modeDemo: 'Demo balance',
    modeWallet: 'Connect your wallet',
    modeHint: 'In demo mode the agent spends virtual balance. Connecting a real wallet (CDP) is available via API and integrations.',
    error: 'Failed to create agent',
    creating: 'Creating...',
    submit: 'Create',
  },
};

export function CreateAgentForm() {
  const router = useRouter();
  const lang = useLang();
  const text = t[lang as Lang];
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [agentType, setAgentType] = useState<'INVESTOR' | 'TRADER'>('INVESTOR');
  const [mode, setMode] = useState<'DEMO' | 'WALLET'>('DEMO');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const result = schema.safeParse({
      name: name.trim(),
      description: description.trim() || undefined,
      agentType,
      mode,
    });
    if (!result.success) {
      const first = result.error.issues[0];
      setError(first?.message ?? text.error);
      return;
    }
    const data = result.data;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const serverError =
          payload && typeof payload.error === 'string'
            ? payload.error
            : text.error;
        setError(serverError);
        return;
      }
      const agent = await res.json();
      router.push(withLang(`/dashboard/agents/${agent._id}`, lang));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{text.name}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={text.namePlaceholder}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{text.description}</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={text.descriptionPlaceholder}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{text.agentType}</label>
            <select
              value={agentType}
              onChange={(e) => setAgentType(e.target.value as 'INVESTOR' | 'TRADER')}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50"
            >
              <option value="INVESTOR">{text.investor}</option>
              <option value="TRADER">{text.trader}</option>
            </select>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {text.typeHint}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{text.mode}</label>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  value="DEMO"
                  checked={mode === 'DEMO'}
                  onChange={() => setMode('DEMO')}
                />
                <span>{text.modeDemo}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  value="WALLET"
                  checked={mode === 'WALLET'}
                  onChange={() => setMode('WALLET')}
                />
                <span>{text.modeWallet}</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {text.modeHint}
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? text.creating : text.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

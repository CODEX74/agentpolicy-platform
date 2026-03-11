'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { Resolver, ResolverResult } from 'react-hook-form';
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

function createZodResolver<T extends z.ZodType>(schema: T): Resolver<z.infer<T>> {
  type TForm = z.infer<T>;
  return async (values): Promise<ResolverResult<TForm>> => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, { message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!errors[path]) {
        errors[path] = { message: issue.message };
      }
    }
    return { values: {} as TForm, errors: errors as ResolverResult<TForm>['errors'] };
  };
}

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
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: createZodResolver(schema),
    defaultValues: { agentType: 'INVESTOR', mode: 'DEMO' },
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      setError(null);
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
    },
    [router, lang, text.error]
  );

  const handleFormSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      const fn = typeof handleSubmit === 'function' ? handleSubmit(onSubmit) : null;
      if (typeof fn === 'function') {
        return fn(e);
      }
      e.preventDefault();
      setError('Ошибка инициализации формы. Обновите страницу.');
    },
    [handleSubmit, onSubmit]
  );

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{text.name}</label>
            <Input {...register('name')} placeholder={text.namePlaceholder} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{text.description}</label>
            <Input {...register('description')} placeholder={text.descriptionPlaceholder} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{text.agentType}</label>
            <select
              {...register('agentType')}
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
                  value="DEMO"
                  {...register('mode')}
                  defaultChecked
                />
                <span>{text.modeDemo}</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="WALLET"
                  {...register('mode')}
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

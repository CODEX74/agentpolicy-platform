'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useLang, withLang } from '@/contexts/LanguageContext';
import type { Lang } from '@/contexts/LanguageContext';

const ALLOWED_OPERATIONS = ['buy', 'sell', 'swap', 'hold'] as const;
const OP_LABELS: Record<Lang, Record<(typeof ALLOWED_OPERATIONS)[number], string>> = {
  ru: { buy: 'Покупка', sell: 'Продажа', swap: 'Обмен', hold: 'Удержание' },
  en: { buy: 'Buy', sell: 'Sell', swap: 'Swap', hold: 'Hold' },
};

const policySchema = z.object({
  name: z.string().min(1).optional(),
  dailyLimit: z.number().min(0),
  weeklyLimit: z.number().min(0),
  maxPerTransaction: z.number().min(0),
  allowedOperations: z.array(z.enum(ALLOWED_OPERATIONS)).optional(),
  timeRestrictionsEnabled: z.boolean().optional(),
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(0).max(23),
  minHoldingValue: z.number().min(0).optional(),
  minHoldingUnit: z.enum(['minutes', 'hours', 'days', 'months', 'years']).optional(),
  notifyEmail: z.boolean().optional(),
  notifyTelegram: z.boolean().optional(),
  onEachTransaction: z.boolean().optional(),
  onLimitExceeded: z.boolean().optional(),
});

type PolicyFormValues = z.infer<typeof policySchema>;

interface PolicyBuilderProps {
  agentId: string;
  initialPolicy?: Partial<PolicyFormValues>;
  onSave?: (data: PolicyFormValues) => Promise<void>;
}

const defaultValues: PolicyFormValues = {
  name: 'Default Policy',
  dailyLimit: 0,
  weeklyLimit: 0,
  maxPerTransaction: 0,
  allowedOperations: ['buy', 'hold'],
  timeRestrictionsEnabled: false,
  startHour: 0,
  endHour: 23,
  minHoldingValue: 60,
  minHoldingUnit: 'minutes',
  notifyEmail: true,
  notifyTelegram: false,
  onEachTransaction: true,
  onLimitExceeded: true,
};

const t: Record<Lang, {
  limitsTitle: string;
  dailyLimit: string;
  weeklyLimit: string;
  maxPerTx: string;
  holdingTitle: string;
  holdingDesc: string;
  allowedOps: string;
  notifications: string;
  telegramHint: string;
  telegramLink: string;
  telegramBot: string;
  openaiHint: string;
  onEachTx: string;
  onLimitExceeded: string;
  saved: string;
  saveBtn: string;
  saving: string;
  errSave: string;
  errOpenai: string;
  errTelegram: string;
  linkSettings: string;
  linkSettingsTelegram: string;
  linkSettingsOpenai: string;
}> = {
  ru: {
    limitsTitle: 'Лимиты трат (USDT)',
    dailyLimit: 'Дневной лимит',
    weeklyLimit: 'Недельный лимит',
    maxPerTx: 'Максимум за транзакцию',
    holdingTitle: 'Максимальный срок удержания',
    holdingDesc: 'Максимальное время, в течение которого агент может держать позицию до фиксации хотя бы одной сделки (продажи). Параметр используется и для Инвестора, и для Трейдера.',
    allowedOps: 'Разрешённые операции',
    notifications: 'Уведомления',
    telegramHint: 'Сначала привяжите Telegram chat id в Настройках',
    telegramLink: 'Чтобы включить Telegram-уведомления, привяжите chat id в',
    telegramBot: 'Бот Telegram: Напишите ему /start и /balance, чтобы увидеть статусы агентов.',
    openaiHint: 'Чтобы агент работал и политика сохранялась, укажите OpenAI API key в',
    onEachTx: 'При каждой транзакции',
    onLimitExceeded: 'При превышении лимита',
    saved: 'Политика сохранена.',
    saveBtn: 'Сохранить политику',
    saving: 'Сохранение...',
    errSave: 'Не удалось сохранить',
    errOpenai: 'Чтобы сохранить политику и запускать агента, сначала укажите OpenAI API key: Настройки → OpenAI (ChatGPT).',
    errTelegram: 'Чтобы включить уведомления в Telegram, сначала привяжите chat id: Настройки → Telegram.',
    linkSettings: 'Настройки',
    linkSettingsTelegram: 'Настройки → Telegram',
    linkSettingsOpenai: 'Настройки → OpenAI (ChatGPT)',
  },
  en: {
    limitsTitle: 'Spending limits (USDT)',
    dailyLimit: 'Daily limit',
    weeklyLimit: 'Weekly limit',
    maxPerTx: 'Max per transaction',
    holdingTitle: 'Max holding period',
    holdingDesc: 'Maximum time the agent can hold a position before closing at least one trade (sell). Used for both Investor and Trader.',
    allowedOps: 'Allowed operations',
    notifications: 'Notifications',
    telegramHint: 'Link Telegram chat id in Settings first',
    telegramLink: 'To enable Telegram notifications, link your chat id in',
    telegramBot: 'Telegram bot: Send /start and /balance to see agent statuses.',
    openaiHint: 'For the agent to run and policy to save, set OpenAI API key in',
    onEachTx: 'On each transaction',
    onLimitExceeded: 'On limit exceeded',
    saved: 'Policy saved.',
    saveBtn: 'Save policy',
    saving: 'Saving...',
    errSave: 'Failed to save',
    errOpenai: 'To save policy and run the agent, set OpenAI API key first: Settings → OpenAI (ChatGPT).',
    errTelegram: 'To enable Telegram notifications, link your chat id first: Settings → Telegram.',
    linkSettings: 'Settings',
    linkSettingsTelegram: 'Settings → Telegram',
    linkSettingsOpenai: 'Settings → OpenAI (ChatGPT)',
  },
};

const UNIT_LABELS: Record<Lang, Record<string, string>> = {
  ru: { minutes: 'минут', hours: 'часов', days: 'дней', months: 'месяцев', years: 'лет' },
  en: { minutes: 'min', hours: 'hr', days: 'days', months: 'mo', years: 'yr' },
};

export function PolicyBuilder({ agentId, initialPolicy, onSave }: PolicyBuilderProps) {
  const lang = useLang();
  const text = t[lang];
  const opLabels = OP_LABELS[lang];
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState<boolean | null>(null);
  const [openaiHasKey, setOpenaiHasKey] = useState<boolean | null>(null);

  const {
    register,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<PolicyFormValues>({
    defaultValues: { ...defaultValues, ...initialPolicy },
  });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/telegram')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const id = (data && typeof data.telegramId === 'string' ? data.telegramId : '').trim();
        setTelegramLinked(Boolean(id));
      })
      .catch(() => setTelegramLinked(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/openai-key')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setOpenaiHasKey(Boolean(data?.hasKey));
      })
      .catch(() => setOpenaiHasKey(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Если Telegram не привязан — не даём включать галочку
  const notifyTelegram = watch('notifyTelegram');
  useEffect(() => {
    if (telegramLinked === false && notifyTelegram) {
      setValue('notifyTelegram', false, { shouldValidate: true, shouldDirty: true });
    }
  }, [telegramLinked, notifyTelegram, setValue]);

  const save = async (data: PolicyFormValues) => {
    setSaveStatus('idle');
    setSaveError(null);
    if (openaiHasKey === false) {
      setSaveError(text.errOpenai);
      setSaveStatus('error');
      throw new Error(text.errOpenai);
    }
    if (Boolean(data.notifyTelegram) && telegramLinked === false) {
      setSaveError(text.errTelegram);
      setSaveStatus('error');
      throw new Error(text.errTelegram);
    }
    if (onSave) {
      await onSave(data);
      setSaveStatus('success');
      return;
    }
    const num = (v: unknown, fallback = 0): number =>
      typeof v === 'number' && !Number.isNaN(v) ? v : fallback;
    const arr = (v: unknown): string[] => {
      if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
      if (typeof v === 'string' && v) return [v];
      return ['buy', 'hold'];
    };
    const payload = {
      agentId,
      dailyLimit: num(data.dailyLimit),
      weeklyLimit: num(data.weeklyLimit),
      maxPerTransaction: num(data.maxPerTransaction),
      allowedOperations: arr(data.allowedOperations),
      timeRestrictions: {
        enabled: Boolean(data.timeRestrictionsEnabled),
        startHour: num(data.startHour, 0),
        endHour: num(data.endHour, 23),
        minHolding: {
          value: num(data.minHoldingValue, 60),
          unit: data.minHoldingUnit ?? 'minutes',
        },
      },
      notifications: {
        email: Boolean(data.notifyEmail),
        telegram: Boolean(data.notifyTelegram),
        onEachTransaction: Boolean(data.onEachTransaction),
        onLimitExceeded: Boolean(data.onLimitExceeded),
      },
    };
    const res = await fetch('/api/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = typeof err?.error === 'string' ? err.error : err?.message ?? text.errSave;
      setSaveError(message);
      setSaveStatus('error');
      throw new Error(message);
    }
    setSaveStatus('success');
  };

  const onFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearErrors();
    const values = getValues();
    const result = policySchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join('.');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
setError(path as any, { message: issue.message });
      }
      return;
    }
    save(result.data);
  };

  return (
    <form onSubmit={onFormSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">{text.limitsTitle}</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{text.dailyLimit}</label>
            <Input
              type="number"
              step="0.001"
              {...register('dailyLimit', { valueAsNumber: true })}
            />
            {errors.dailyLimit && (
              <p className="mt-1 text-sm text-red-600">{errors.dailyLimit.message}</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{text.weeklyLimit}</label>
            <Input
              type="number"
              step="0.001"
              {...register('weeklyLimit', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{text.maxPerTx}</label>
            <Input
              type="number"
              step="0.001"
              {...register('maxPerTransaction', { valueAsNumber: true })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">{text.holdingTitle}</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {text.holdingDesc}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              step="1"
              min="0"
              className="w-24"
              {...register('minHoldingValue', { valueAsNumber: true })}
            />
            <select
              {...register('minHoldingUnit')}
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              {(['minutes', 'hours', 'days', 'months', 'years'] as const).map((u) => (
                <option key={u} value={u}>{UNIT_LABELS[lang][u]}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">{text.allowedOps}</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALLOWED_OPERATIONS.map((op) => (
            <label key={op} className="flex items-center gap-2">
              <input type="checkbox" {...register('allowedOperations')} value={op} />
              <span className="text-sm">{opLabels[op]}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">{text.notifications}</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('notifyEmail')} />
            <span className="text-sm">Email</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('notifyTelegram')}
              disabled={telegramLinked === false}
              title={telegramLinked === false ? text.telegramHint : undefined}
            />
            <span className="text-sm">Telegram</span>
          </label>
          {telegramLinked === false && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {text.telegramLink}{' '}
              <Link href={withLang('/dashboard/settings', lang)} className="underline">
                {text.linkSettingsTelegram}
              </Link>
              .
            </p>
          )}
          {telegramLinked && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {text.telegramBot}{' '}
              <Link href="https://t.me/AgentPolicyBot" target="_blank" rel="noopener noreferrer" className="underline">
                @AgentPolicyBot
              </Link>
            </p>
          )}
          {openaiHasKey === false && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {text.openaiHint}{' '}
              <Link href={withLang('/dashboard/settings', lang)} className="underline">
                {text.linkSettingsOpenai}
              </Link>
              .
            </p>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('onEachTransaction')} />
            <span className="text-sm">{text.onEachTx}</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('onLimitExceeded')} />
            <span className="text-sm">{text.onLimitExceeded}</span>
          </label>
        </CardContent>
      </Card>

      {saveStatus === 'success' && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{text.saved}</p>
      )}
      {saveStatus === 'error' && saveError && (
        <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
      )}
      <Button type="submit" disabled={isSubmitting || openaiHasKey === false} className="w-full">
        {isSubmitting ? text.saving : text.saveBtn}
      </Button>
    </form>
  );
}

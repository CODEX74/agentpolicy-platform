'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

const ALLOWED_OPERATIONS = ['buy', 'sell', 'swap', 'hold'] as const;
const ALLOWED_OPERATIONS_LABELS: Record<(typeof ALLOWED_OPERATIONS)[number], string> = {
  buy: 'Покупка',
  sell: 'Продажа',
  swap: 'Обмен',
  hold: 'Удержание',
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
  notifyEmail: true,
  notifyTelegram: false,
  onEachTransaction: true,
  onLimitExceeded: true,
};

export function PolicyBuilder({ agentId, initialPolicy, onSave }: PolicyBuilderProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [telegramLinked, setTelegramLinked] = useState<boolean | null>(null);
  const [openaiHasKey, setOpenaiHasKey] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
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
      const message =
        'Чтобы сохранить политику и запускать агента, сначала укажите OpenAI API key: Настройки → OpenAI (ChatGPT).';
      setSaveError(message);
      setSaveStatus('error');
      throw new Error(message);
    }
    if (Boolean(data.notifyTelegram) && telegramLinked === false) {
      const message = 'Чтобы включить уведомления в Telegram, сначала привяжите chat id: Настройки → Telegram.';
      setSaveError(message);
      setSaveStatus('error');
      throw new Error(message);
    }
    if (onSave) {
      await onSave(data);
      setSaveStatus('success');
      return;
    }
    const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
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
      const message = typeof err?.error === 'string' ? err.error : err?.message ?? 'Не удалось сохранить';
      setSaveError(message);
      setSaveStatus('error');
      throw new Error(message);
    }
    setSaveStatus('success');
  };

  return (
    <form onSubmit={handleSubmit(save)} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Лимиты трат (USDT)</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Дневной лимит</label>
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
            <label className="mb-1 block text-sm font-medium">Недельный лимит</label>
            <Input
              type="number"
              step="0.001"
              {...register('weeklyLimit', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Максимум за транзакцию</label>
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
          <h3 className="text-lg font-medium">Разрешённые операции</h3>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALLOWED_OPERATIONS.map((op) => (
            <label key={op} className="flex items-center gap-2">
              <input type="checkbox" {...register('allowedOperations')} value={op} />
              <span className="text-sm">{ALLOWED_OPERATIONS_LABELS[op]}</span>
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Уведомления</h3>
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
              title={
                telegramLinked === false
                  ? 'Сначала привяжите Telegram chat id в Настройках'
                  : undefined
              }
            />
            <span className="text-sm">Telegram</span>
          </label>
          {telegramLinked === false && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Чтобы включить Telegram-уведомления, привяжите chat id в{' '}
              <Link href="/dashboard/settings" className="underline">
                Настройки → Telegram
              </Link>
              .
            </p>
          )}
          {openaiHasKey === false && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Чтобы агент работал и политика сохранялась, укажите OpenAI API key в{' '}
              <Link href="/dashboard/settings" className="underline">
                Настройки → OpenAI (ChatGPT)
              </Link>
              .
            </p>
          )}
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('onEachTransaction')} />
            <span className="text-sm">При каждой транзакции</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('onLimitExceeded')} />
            <span className="text-sm">При превышении лимита</span>
          </label>
        </CardContent>
      </Card>

      {saveStatus === 'success' && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">Политика сохранена.</p>
      )}
      {saveStatus === 'error' && saveError && (
        <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
      )}
      <Button type="submit" disabled={isSubmitting || openaiHasKey === false} className="w-full">
        {isSubmitting ? 'Сохранение...' : 'Сохранить политику'}
      </Button>
    </form>
  );
}

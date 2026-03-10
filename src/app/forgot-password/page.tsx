'use client';

import { useState } from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';

const schemaStep1 = z.object({
  email: z.string().email('Введите корректный email'),
});

const schemaStep2 = z.object({
  code: z.string().min(6, 'Код из 6 цифр').max(6, 'Код из 6 цифр'),
  password: z.string().min(6, 'Пароль не менее 6 символов'),
});

type Step1Form = z.infer<typeof schemaStep1>;
type Step2Form = z.infer<typeof schemaStep2>;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1 },
  } = useForm<Step1Form>({
    resolver: zodResolver(schemaStep1),
  });

  const {
    register: registerStep2,
    handleSubmit: handleSubmitStep2,
    formState: { errors: errorsStep2 },
  } = useForm<Step2Form>({
    resolver: zodResolver(schemaStep2),
  });

  const onRequestCode = async (data: Step1Form) => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Не удалось отправить код');
        setLoading(false);
        return;
      }
      setEmail(data.email);
      setInfo('Код сброса отправлен на вашу почту. Введите его ниже вместе с новым паролем.');
      setStep(2);
    } catch {
      setError('Ошибка. Проверьте подключение к интернету и к базе данных.');
    } finally {
      setLoading(false);
    }
  };

  const onResetPassword = async (data: Step2Form) => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...data }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Не удалось сбросить пароль');
        setLoading(false);
        return;
      }
      setInfo('Пароль успешно изменён. Теперь вы можете войти.');
    } catch {
      setError('Ошибка. Проверьте подключение к интернету и к базе данных.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Восстановление пароля
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Сначала отправим код на email, затем вы зададите новый пароль.
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSubmitStep1(onRequestCode)} className="space-y-4">
            <div>
              <Input
                {...registerStep1('email')}
                type="email"
                placeholder="Email"
                autoComplete="email"
                className="w-full"
              />
              {errorsStep1.email && (
                <p className="mt-1 text-sm text-red-600">{errorsStep1.email.message}</p>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg">
                {info}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className={cn(buttonVariants({ size: 'default' }), 'w-full')}
            >
              {loading ? 'Отправка...' : 'Отправить код'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmitStep2(onResetPassword)} className="space-y-4">
            <div>
              <Input
                value={email}
                readOnly
                className="w-full bg-zinc-100 dark:bg-zinc-900"
              />
            </div>
            <div>
              <Input
                {...registerStep2('code')}
                type="text"
                placeholder="Код из письма (6 цифр)"
                inputMode="numeric"
                maxLength={6}
                className="w-full tracking-[0.3em] text-center"
              />
              {errorsStep2.code && (
                <p className="mt-1 text-sm text-red-600">{errorsStep2.code.message}</p>
              )}
            </div>
            <div>
              <Input
                {...registerStep2('password')}
                type="password"
                placeholder="Новый пароль (не менее 6 символов)"
                autoComplete="new-password"
                className="w-full"
              />
              {errorsStep2.password && (
                <p className="mt-1 text-sm text-red-600">{errorsStep2.password.message}</p>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg">
                {error}
              </p>
            )}
            {info && (
              <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-lg">
                {info}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className={cn(buttonVariants({ size: 'default' }), 'w-full')}
            >
              {loading ? 'Сохранение...' : 'Сбросить пароль'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-zinc-500">
          Вспомнили пароль?{' '}
          <Link href="/login" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}


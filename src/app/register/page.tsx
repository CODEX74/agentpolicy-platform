'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль не менее 6 символов'),
  name: z.string().min(1, 'Введите имя').max(200),
  confirmCode: z.string().optional(),
  acceptPrivacy: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо согласиться с Политикой конфиденциальности' }),
  }),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Ошибка регистрации');
        setLoading(false);
        return;
      }
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch {
      setError('Ошибка. Проверьте подключение к интернету и к базе данных.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Регистрация
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Создайте аккаунт для входа в дашборд
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              {...register('name')}
              type="text"
              placeholder="Имя"
              autoComplete="name"
              className="w-full"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <Input
              {...register('email')}
              type="email"
              placeholder="Email"
              autoComplete="email"
              className="w-full"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Input
              {...register('password')}
              type="password"
              placeholder="Пароль (не менее 6 символов)"
              autoComplete="new-password"
              className="w-full"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Input
              {...register('confirmCode')}
              type="text"
              placeholder="Код подтверждения (если уже есть)"
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" {...register('acceptPrivacy')} className="mt-0.5" />
              <span>
                Я подтверждаю, что ознакомился и согласен с{' '}
                <Link href="/privacy" className="underline hover:text-zinc-700 dark:hover:text-zinc-200">
                  Политикой конфиденциальности и отказом от ответственности
                </Link>
                .
              </span>
            </label>
            {errors.acceptPrivacy && (
              <p className="mt-1 text-sm text-red-600">{errors.acceptPrivacy.message}</p>
            )}
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg space-y-2">
              <p>{error}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                1) Проверьте подключение к интернету.<br />
                2) Проверьте: <a href="/api/health" target="_blank" rel="noopener noreferrer" className="underline">/api/health</a>
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className={cn(buttonVariants({ size: 'default' }), 'w-full')}
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Уже есть аккаунт?{' '}
          <Link href="/login" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            Войти
          </Link>
        </p>
        <p className="text-center text-sm text-zinc-500">
          <Link href="/" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            ← На главную
          </Link>
        </p>
      </div>
    </div>
  );
}

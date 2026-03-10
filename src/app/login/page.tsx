'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
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
      const timeoutMs = 15000;
      const res = await Promise.race([
        signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
          callbackUrl: '/dashboard',
        }),
        new Promise<undefined>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        ),
      ]);
      if (res && typeof res === 'object') {
        if ('ok' in res && res.ok && 'url' in res && res.url) {
          router.push(res.url);
          return;
        }
        if ('error' in res && res.error) {
          if (res.error === 'CredentialsSignin') {
            setError('Неверный email или пароль. Зарегистрируйтесь, если ещё нет аккаунта.');
          } else if (res.error === 'Configuration') {
            setError('Ошибка конфигурации авторизации. Проверьте настройки сервера.');
          } else {
            setError('Ошибка входа. Попробуйте ещё раз или воспользуйтесь другим способом входа.');
          }
          return;
        }
      }
      setError('Ошибка входа. Проверьте подключение к базе данных.');
    } catch (err) {
      if (err instanceof Error && err.message === 'timeout') {
        setError('Сервер не отвечает. Проверьте подключение к интернету.');
      } else {
        setError('Ошибка входа. Проверьте подключение к базе данных.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setError(null);
    signIn('google', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Вход
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Введите email и пароль для входа в дашборд
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              placeholder="Пароль"
              autoComplete="current-password"
              className="w-full"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/50 p-3 rounded-lg">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className={cn(
              buttonVariants({ size: 'default' }),
              'w-full'
            )}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
          >
            Забыли пароль?
          </Link>
        </div>

        <div className="relative mt-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-zinc-50 dark:bg-zinc-950 px-2 text-zinc-500">
              или
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-center">
            <button
              type="button"
              onClick={handleGoogle}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'default' }),
                'w-full'
              )}
            >
              Войти через Google
            </button>
          </div>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ size: 'default', variant: 'secondary' }),
              'w-full font-semibold'
            )}
          >
            Нет аккаунта? Зарегистрироваться
          </Link>
        </div>

        <p className="text-center text-sm text-zinc-500 mt-3">
          <Link href="/" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            ← На главную
          </Link>
        </p>
      </div>
    </div>
  );
}

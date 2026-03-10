'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';
import { Input } from '@/components/ui/Input';
import { useLang, withLang, type Lang } from '@/contexts/LanguageContext';

const schemas = {
  ru: z.object({
    email: z.string().email('Введите корректный email'),
    password: z.string().min(1, 'Введите пароль'),
  }),
  en: z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(1, 'Enter password'),
  }),
};

type FormData = z.infer<typeof schemas.ru>;

const t: Record<Lang, Record<string, string>> = {
  ru: {
    title: 'Вход',
    subtitle: 'Введите email и пароль для входа в дашборд',
    email: 'Email',
    password: 'Пароль',
    submit: 'Войти',
    submitting: 'Вход...',
    forgotPassword: 'Забыли пароль?',
    or: 'или',
    signInGoogle: 'Войти через Google',
    noAccount: 'Нет аккаунта? Зарегистрироваться',
    backHome: '← На главную',
    errorCredentials: 'Неверный email или пароль. Зарегистрируйтесь, если ещё нет аккаунта.',
    errorConfig: 'Ошибка конфигурации авторизации. Проверьте настройки сервера.',
    errorTryAgain: 'Ошибка входа. Попробуйте ещё раз или воспользуйтесь другим способом входа.',
    errorDb: 'Ошибка входа. Проверьте подключение к базе данных.',
    errorTimeout: 'Сервер не отвечает. Проверьте подключение к интернету.',
  },
  en: {
    title: 'Sign in',
    subtitle: 'Enter your email and password to access the dashboard',
    email: 'Email',
    password: 'Password',
    submit: 'Sign in',
    submitting: 'Signing in...',
    forgotPassword: 'Forgot password?',
    or: 'or',
    signInGoogle: 'Sign in with Google',
    noAccount: "Don't have an account? Sign up",
    backHome: '← Back to home',
    errorCredentials: 'Invalid email or password. Sign up if you don\'t have an account.',
    errorConfig: 'Auth configuration error. Check server settings.',
    errorTryAgain: 'Sign-in error. Try again or use another sign-in method.',
    errorDb: 'Sign-in error. Check database connection.',
    errorTimeout: 'Server not responding. Check your internet connection.',
  },
};

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const lang = useLang();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const schema = schemas[lang];
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  const text = t[lang];

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const callbackUrl = lang === 'en' ? '/dashboard?lang=en' : '/dashboard';
      const timeoutMs = 15000;
      const res = await Promise.race([
        signIn('credentials', {
          email: data.email,
          password: data.password,
          redirect: false,
          callbackUrl,
        }),
        new Promise<undefined>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        ),
      ]);
      if (res && typeof res === 'object') {
        if ('ok' in res && res.ok && 'url' in res && res.url) {
          router.push(lang === 'en' ? '/dashboard?lang=en' : res.url);
          return;
        }
        if ('error' in res && res.error) {
          if (res.error === 'CredentialsSignin') {
            setError(text.errorCredentials);
          } else if (res.error === 'Configuration') {
            setError(text.errorConfig);
          } else {
            setError(text.errorTryAgain);
          }
          return;
        }
      }
      setError(text.errorDb);
    } catch (err) {
      if (err instanceof Error && err.message === 'timeout') {
        setError(text.errorTimeout);
      } else {
        setError(text.errorDb);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setError(null);
    signIn('google', { callbackUrl: lang === 'en' ? '/dashboard?lang=en' : '/dashboard' });
  };

  const setLang = (l: Lang) => {
    router.push(l === 'en' ? `${pathname}?lang=en` : pathname);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="absolute right-4 top-4 flex gap-2 text-sm text-zinc-500">
        <button type="button" onClick={() => setLang('ru')} className={cn(lang === 'ru' && 'font-semibold text-zinc-900 dark:text-zinc-100')}>RU</button>
        <span>|</span>
        <button type="button" onClick={() => setLang('en')} className={cn(lang === 'en' && 'font-semibold text-zinc-900 dark:text-zinc-100')}>EN</button>
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{text.title}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{text.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input
              {...register('email')}
              type="email"
              placeholder={text.email}
              autoComplete="email"
              className="w-full"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <Input
              {...register('password')}
              type="password"
              placeholder={text.password}
              autoComplete="current-password"
              className="w-full"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50">{error}</p>
          )}
          <button type="submit" disabled={loading} className={cn(buttonVariants({ size: 'default' }), 'w-full')}>
            {loading ? text.submitting : text.submit}
          </button>
        </form>

        <div className="flex justify-end">
          <Link href={withLang('/forgot-password', lang)} className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
            {text.forgotPassword}
          </Link>
        </div>

        <div className="relative mt-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-zinc-50 px-2 text-zinc-500 dark:bg-zinc-950">{text.or}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-center">
            <button type="button" onClick={handleGoogle} className={cn(buttonVariants({ variant: 'outline', size: 'default' }), 'w-full')}>
              {text.signInGoogle}
            </button>
          </div>
          <Link href={withLang('/register', lang)} className={cn(buttonVariants({ size: 'default', variant: 'secondary' }), 'w-full font-semibold')}>
            {text.noAccount}
          </Link>
        </div>

        <p className="mt-3 text-center text-sm text-zinc-500">
          <Link href={lang === 'en' ? '/?lang=en' : '/'} className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            {text.backHome}
          </Link>
        </p>
      </div>
    </div>
  );
}

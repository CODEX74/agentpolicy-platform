'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
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
    password: z.string().min(6, 'Пароль не менее 6 символов'),
    name: z.string().min(1, 'Введите имя').max(200),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({ message: 'Необходимо согласиться с Политикой конфиденциальности' }),
    }),
  }),
  en: z.object({
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Enter name').max(200),
    acceptPrivacy: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Privacy Policy' }),
    }),
  }),
};

type FormData = z.infer<typeof schemas.ru>;

const t: Record<Lang, Record<string, string>> = {
  ru: {
    title: 'Регистрация',
    subtitle: 'Создайте аккаунт для входа в дашборд',
    name: 'Имя',
    email: 'Email',
    password: 'Пароль (не менее 6 символов)',
    privacy: 'Я подтверждаю, что ознакомился и согласен с',
    privacyLink: 'Политикой конфиденциальности и отказом от ответственности',
    submit: 'Зарегистрироваться',
    submitting: 'Регистрация...',
    error: 'Ошибка регистрации',
    errorNetwork: 'Ошибка. Проверьте подключение к интернету и к базе данных.',
    checkInternet: '1) Проверьте подключение к интернету.',
    haveAccount: 'Уже есть аккаунт?',
    signIn: 'Войти',
    backHome: '← На главную',
  },
  en: {
    title: 'Sign up',
    subtitle: 'Create an account to access the dashboard',
    name: 'Name',
    email: 'Email',
    password: 'Password (at least 6 characters)',
    privacy: 'I confirm that I have read and agree to the',
    privacyLink: 'Privacy Policy and Disclaimer',
    submit: 'Sign up',
    submitting: 'Signing up...',
    error: 'Registration error',
    errorNetwork: 'Error. Check your internet and database connection.',
    checkInternet: '1) Check your internet connection.',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    backHome: '← Back to home',
  },
};

export default function RegisterPage() {
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || text.error);
        setLoading(false);
        return;
      }
      router.push(withLang(`/verify-email?email=${encodeURIComponent(data.email)}`, lang));
    } catch {
      setError(text.errorNetwork);
      setLoading(false);
    }
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
            <Input {...register('name')} type="text" placeholder={text.name} autoComplete="name" className="w-full" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Input {...register('email')} type="email" placeholder={text.email} autoComplete="email" className="w-full" />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <Input {...register('password')} type="password" placeholder={text.password} autoComplete="new-password" className="w-full" />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <input type="checkbox" {...register('acceptPrivacy')} className="mt-0.5" />
              <span>
                {text.privacy}{' '}
                <Link href={withLang('/privacy', lang)} className="underline hover:text-zinc-700 dark:hover:text-zinc-200">
                  {text.privacyLink}
                </Link>
                .
              </span>
            </label>
            {errors.acceptPrivacy && <p className="mt-1 text-sm text-red-600">{errors.acceptPrivacy.message}</p>}
          </div>
          {error && (
            <div className="space-y-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50">
              <p>{error}</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {text.checkInternet}<br />
                2) Check: <a href="/api/health" target="_blank" rel="noopener noreferrer" className="underline">/api/health</a>
              </p>
            </div>
          )}
          <button type="submit" disabled={loading} className={cn(buttonVariants({ size: 'lg', variant: 'default' }), 'h-11 w-full text-base font-semibold shadow-md shadow-zinc-900/40 dark:shadow-zinc-950/60')}>
            {loading ? text.submitting : text.submit}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          {text.haveAccount}{' '}
          <Link href={withLang('/login', lang)} className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            {text.signIn}
          </Link>
        </p>
        <p className="text-center text-sm text-zinc-500">
          <Link href={lang === 'en' ? '/?lang=en' : '/'} className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            {text.backHome}
          </Link>
        </p>
      </div>
    </div>
  );
}

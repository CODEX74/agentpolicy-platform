'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';
import { useLang, withLang, type Lang } from '@/contexts/LanguageContext';

const schemas = {
  ru: z.object({
    email: z.string().email('Введите корректный email'),
    code: z.string().min(6, 'Код из 6 цифр').max(6, 'Код из 6 цифр'),
  }),
  en: z.object({
    email: z.string().email('Enter a valid email'),
    code: z.string().min(6, '6-digit code').max(6, '6-digit code'),
  }),
};

type FormData = z.infer<typeof schemas.ru>;

const t: Record<Lang, Record<string, string>> = {
  ru: {
    title: 'Подтверждение email',
    subtitle: 'Мы отправили код подтверждения на вашу почту. Введите его ниже.',
    email: 'Email',
    codePlaceholder: 'Код из письма (6 цифр)',
    submit: 'Подтвердить email',
    checking: 'Проверка...',
    error: 'Неверный код подтверждения',
    errorNetwork: 'Ошибка. Проверьте подключение к интернету и к базе данных.',
    alreadyVerified: 'Уже подтвердили?',
    signIn: 'Войти',
  },
  en: {
    title: 'Verify email',
    subtitle: 'We sent a verification code to your email. Enter it below.',
    email: 'Email',
    codePlaceholder: 'Code from email (6 digits)',
    submit: 'Verify email',
    checking: 'Verifying...',
    error: 'Invalid verification code',
    errorNetwork: 'Error. Check your internet and database connection.',
    alreadyVerified: 'Already verified?',
    signIn: 'Sign in',
  },
};

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const lang = useLang();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const schema = schemas[lang];
  const text = t[lang];

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    const emailParam = params.get('email');
    if (emailParam) setValue('email', emailParam);
  }, [params, setValue]);

  const onSubmit = async (data: FormData) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
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
      router.push(withLang('/login?verified=1', lang));
    } catch {
      setError(text.errorNetwork);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{text.title}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{text.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Input {...register('email')} type="email" placeholder={text.email} autoComplete="email" className="w-full" />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <Input {...register('code')} type="text" placeholder={text.codePlaceholder} inputMode="numeric" maxLength={6} className="w-full text-center tracking-[0.3em]" />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
          </div>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50">{error}</p>}
          <button type="submit" disabled={loading} className={cn(buttonVariants({ size: 'default' }), 'w-full')}>
            {loading ? text.checking : text.submit}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          {text.alreadyVerified}{' '}
          <Link href={withLang('/login', lang)} className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            {text.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailInner />
    </Suspense>
  );
}


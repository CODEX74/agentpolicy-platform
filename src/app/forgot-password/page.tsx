'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/Input';
import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';
import { useLang, withLang, type Lang } from '@/contexts/LanguageContext';

const schemas = {
  ru: {
    step1: z.object({ email: z.string().email('Введите корректный email') }),
    step2: z.object({
      code: z.string().min(6, 'Код из 6 цифр').max(6, 'Код из 6 цифр'),
      password: z.string().min(6, 'Пароль не менее 6 символов'),
    }),
  },
  en: {
    step1: z.object({ email: z.string().email('Enter a valid email') }),
    step2: z.object({
      code: z.string().min(6, '6-digit code').max(6, '6-digit code'),
      password: z.string().min(6, 'Password at least 6 characters'),
    }),
  },
};

type Step1Form = z.infer<typeof schemas.ru.step1>;
type Step2Form = z.infer<typeof schemas.ru.step2>;

const t: Record<Lang, Record<string, string>> = {
  ru: {
    title: 'Восстановление пароля',
    subtitle: 'Сначала отправим код на email, затем вы зададите новый пароль.',
    sendCode: 'Отправить код',
    sending: 'Отправка...',
    codePlaceholder: 'Код из письма (6 цифр)',
    newPassword: 'Новый пароль (не менее 6 символов)',
    reset: 'Сбросить пароль',
    saving: 'Сохранение...',
    errorSend: 'Не удалось отправить код',
    infoSent: 'Код сброса отправлен на вашу почту. Введите его ниже вместе с новым паролем.',
    errorReset: 'Не удалось сбросить пароль',
    success: 'Пароль успешно изменён. Теперь вы можете войти.',
    errorNetwork: 'Ошибка. Проверьте подключение к интернету и к базе данных.',
    remember: 'Вспомнили пароль?',
    signIn: 'Войти',
  },
  en: {
    title: 'Reset password',
    subtitle: 'We’ll send a code to your email, then you’ll set a new password.',
    sendCode: 'Send code',
    sending: 'Sending...',
    codePlaceholder: 'Code from email (6 digits)',
    newPassword: 'New password (at least 6 characters)',
    reset: 'Reset password',
    saving: 'Saving...',
    errorSend: 'Failed to send code',
    infoSent: 'Reset code sent to your email. Enter it below with your new password.',
    errorReset: 'Failed to reset password',
    success: 'Password changed successfully. You can now sign in.',
    errorNetwork: 'Error. Check your internet and database connection.',
    remember: 'Remember your password?',
    signIn: 'Sign in',
  },
};

export default function ForgotPasswordPage() {
  const pathname = usePathname();
  const lang = useLang();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const s = schemas[lang];
  const text = t[lang];

  const { register: registerStep1, handleSubmit: handleSubmitStep1, formState: { errors: errorsStep1 } } = useForm<Step1Form>({
    resolver: zodResolver(s.step1),
  });
  const { register: registerStep2, handleSubmit: handleSubmitStep2, formState: { errors: errorsStep2 } } = useForm<Step2Form>({
    resolver: zodResolver(s.step2),
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
        setError(json.error || text.errorSend);
        setLoading(false);
        return;
      }
      setEmail(data.email);
      setInfo(text.infoSent);
      setStep(2);
    } catch {
      setError(text.errorNetwork);
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
        setError(json.error || text.errorReset);
        setLoading(false);
        return;
      }
      setInfo(text.success);
    } catch {
      setError(text.errorNetwork);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="absolute right-4 top-4 flex gap-2 text-sm text-zinc-500">
        <Link href={pathname} className={cn(lang === 'ru' && 'font-semibold text-zinc-900 dark:text-zinc-100')}>RU</Link>
        <span>|</span>
        <Link href={`${pathname}?lang=en`} className={cn(lang === 'en' && 'font-semibold text-zinc-900 dark:text-zinc-100')}>EN</Link>
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{text.title}</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{text.subtitle}</p>
        </div>

        {step === 1 && (
          <form onSubmit={handleSubmitStep1(onRequestCode)} className="space-y-4">
            <div>
              <Input {...registerStep1('email')} type="email" placeholder="Email" autoComplete="email" className="w-full" />
              {errorsStep1.email && <p className="mt-1 text-sm text-red-600">{errorsStep1.email.message}</p>}
            </div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50">{error}</p>}
            {info && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 dark:bg-emerald-950/40">{info}</p>}
            <button type="submit" disabled={loading} className={cn(buttonVariants({ size: 'default' }), 'w-full')}>
              {loading ? text.sending : text.sendCode}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmitStep2(onResetPassword)} className="space-y-4">
            <div>
              <Input value={email} readOnly className="w-full bg-zinc-100 dark:bg-zinc-900" />
            </div>
            <div>
              <Input {...registerStep2('code')} type="text" placeholder={text.codePlaceholder} inputMode="numeric" maxLength={6} className="w-full text-center tracking-[0.3em]" />
              {errorsStep2.code && <p className="mt-1 text-sm text-red-600">{errorsStep2.code.message}</p>}
            </div>
            <div>
              <Input {...registerStep2('password')} type="password" placeholder={text.newPassword} autoComplete="new-password" className="w-full" />
              {errorsStep2.password && <p className="mt-1 text-sm text-red-600">{errorsStep2.password.message}</p>}
            </div>
            {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50">{error}</p>}
            {info && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 dark:bg-emerald-950/40">{info}</p>}
            <button type="submit" disabled={loading} className={cn(buttonVariants({ size: 'default' }), 'w-full')}>
              {loading ? text.saving : text.reset}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-zinc-500">
          {text.remember}{' '}
          <Link href={withLang('/login', lang)} className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            {text.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}

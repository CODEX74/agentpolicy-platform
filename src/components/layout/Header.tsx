'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';
import { withLang } from '@/contexts/LanguageContext';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'AgentPolicy';

export function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const lang = searchParams.get('lang') === 'en' ? 'en' : 'ru';

  const t = {
    howItWorks: lang === 'en' ? 'How it works' : 'Как это работает',
    pricing: lang === 'en' ? 'Pricing' : 'Тарифы',
    dashboard: lang === 'en' ? 'Dashboard' : 'Дашборд',
    loading: lang === 'en' ? 'Loading...' : 'Загрузка...',
    logout: lang === 'en' ? 'Sign out' : 'Выйти',
    login: lang === 'en' ? 'Sign in' : 'Войти',
  } as const;

  const setLang = (next: 'ru' | 'en') => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'ru') {
      params.delete('lang');
    } else {
      params.set('lang', 'en');
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="container flex h-14 items-center justify-between">
        <Link href={lang === 'en' ? '/?lang=en' : '/'} className="font-semibold text-zinc-900 dark:text-zinc-50">
          {appName}
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center rounded-full border border-zinc-200 bg-white text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <button
              type="button"
              onClick={() => setLang('ru')}
              className={cn(
                'rounded-l-full px-2 py-1 transition-colors',
                lang === 'ru' && 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              )}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={cn(
                'rounded-r-full px-2 py-1 transition-colors',
                lang === 'en' && 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              )}
            >
              EN
            </button>
          </div>
          <Link href={withLang('/how-it-works', lang)} className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            {t.howItWorks}
          </Link>
          <Link href={withLang('/pricing', lang)} className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            {t.pricing}
          </Link>
          {status === 'loading' ? (
            <span className="text-sm text-zinc-500">{t.loading}</span>
          ) : session ? (
            <>
              {(session.user as { plan?: string })?.plan === 'enterprise' && (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  Enterprise
                </span>
              )}
              <Link href={withLang('/dashboard', lang)} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'cursor-pointer')}>
                {t.dashboard}
              </Link>
              <button
                type="button"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'cursor-pointer')}
                onClick={() => signOut()}
              >
                {t.logout}
              </button>
            </>
          ) : (
            <Link href={withLang('/login', lang)} className={cn(buttonVariants({ size: 'sm' }), 'cursor-pointer no-underline')}>
              {t.login}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

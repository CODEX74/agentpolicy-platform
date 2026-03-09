'use client';

import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'AgentPolicy';

export function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="font-semibold text-zinc-900 dark:text-zinc-50">
          {appName}
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/how-it-works" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            Как это работает
          </Link>
          <Link href="/pricing" className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
            Тарифы
          </Link>
          {status === 'loading' ? (
            <span className="text-sm text-zinc-500">Загрузка...</span>
          ) : session ? (
            <>
              {(session.user as { plan?: string })?.plan === 'enterprise' && (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                  Enterprise
                </span>
              )}
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'cursor-pointer')}
              >
                Дашборд
              </Link>
              <button
                type="button"
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'cursor-pointer')}
                onClick={() => signOut()}
              >
                Выйти
              </button>
            </>
          ) : (
            <a
              href="/login"
              className={cn(buttonVariants({ size: 'sm' }), 'cursor-pointer no-underline')}
            >
              Войти
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}

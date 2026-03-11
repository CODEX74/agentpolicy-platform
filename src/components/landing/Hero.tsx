 'use client';

import { useSearchParams } from 'next/navigation';
import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'AgentWallet';

type Lang = 'ru' | 'en';

const content: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    primaryCta: string;
    secondaryCta: string;
  }
> = {
  ru: {
    title: 'AI‑агенты, демо‑баланс и реальные сигналы в одном месте',
    subtitle:
      `${appName} — платформа, где вы создаёте торговых агентов, задаёте им политики, запускаете демо‑торговлю и смотрите аналитику по каждому агенту. Уведомления и отчёты приходят в Telegram.`,
    primaryCta: 'Перейти в дашборд',
    secondaryCta: 'Как это работает',
  },
  en: {
    title: 'AI trading agents, demo balance and real‑time signals',
    subtitle:
      `${appName} lets you create trading agents, configure risk policies, run them on a demo balance and monitor detailed analytics per agent. Alerts and reports are delivered to Telegram.`,
    primaryCta: 'Open dashboard',
    secondaryCta: 'How it works',
  },
};

export function Hero({ lang }: { lang?: Lang }) {
  const searchParams = useSearchParams();
  const paramLang = searchParams.get('lang') === 'en' ? 'en' : 'ru';
  const activeLang: Lang = lang ?? paramLang;
  const t = content[activeLang] ?? content.ru;

  return (
    <section className="relative overflow-hidden py-20 sm:py-24 lg:py-32">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-50">
            {t.title}
          </h1>
          <p className="mt-6 text-base leading-7 text-zinc-600 sm:text-lg sm:leading-8 dark:text-zinc-400">
            {t.subtitle}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <a
              href="/dashboard"
              className={cn(buttonVariants({ size: 'lg' }), 'w-full cursor-pointer no-underline sm:w-auto')}
            >
              {t.primaryCta}
            </a>
            <a
              href="/how-it-works"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'w-full cursor-pointer no-underline sm:w-auto'
              )}
            >
              {t.secondaryCta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

 'use client';

import { useSearchParams } from 'next/navigation';
type Lang = 'ru' | 'en';

const stepsByLang: Record<
  Lang,
  { title: string; items: { step: number; title: string; text: string }[] }
> = {
  ru: {
    title: 'Как это работает',
    items: [
      {
        step: 1,
        title: 'Создайте агента и демо‑баланс',
        text: 'Регистрируетесь, подключаете OpenAI API key и создаёте одного или нескольких агентов.',
      },
      {
        step: 2,
        title: 'Опишите политику',
        text: 'Задайте лимиты, разрешённые активы, горизонт торговли и правила уведомлений.',
      },
      {
        step: 3,
        title: 'Запустите демо‑торговлю',
        text: 'Агент принимает решения по рынку и записывает сделки в демо‑кошелёк без риска для реальных средств.',
      },
      {
        step: 4,
        title: 'Смотрите аналитику и Telegram‑отчёты',
        text: 'В дашборде — графики P&L, объёмов и покупок по каждому агенту, в Telegram — уведомления и сводки.',
      },
    ],
  },
  en: {
    title: 'How it works',
    items: [
      {
        step: 1,
        title: 'Create agents and demo balance',
        text: 'Sign up, connect your OpenAI API key and create one or more trading agents.',
      },
      {
        step: 2,
        title: 'Define the policy',
        text: 'Configure limits, allowed assets, time horizon and notification rules.',
      },
      {
        step: 3,
        title: 'Run demo trading',
        text: 'The agent makes market decisions and records trades to a demo wallet — no real funds involved.',
      },
      {
        step: 4,
        title: 'Track analytics and Telegram reports',
        text: 'Use the dashboard for P&L and volume charts per agent, and Telegram for alerts and summaries.',
      },
    ],
  },
};

export function HowItWorks({ lang }: { lang?: Lang }) {
  const searchParams = useSearchParams();
  const paramLang = searchParams.get('lang') === 'en' ? 'en' : 'ru';
  const activeLang: Lang = lang ?? paramLang;
  const t = stepsByLang[activeLang] ?? stepsByLang.ru;

  return (
    <section className="py-20 sm:py-24">
      <div className="container px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {t.title}
        </h2>
        <div className="mx-auto mt-12 max-w-3xl space-y-6 sm:mt-16 sm:space-y-8">
          {t.items.map((s) => (
            <div key={s.step} className="flex gap-4 sm:gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{s.title}</h3>
                <p className="mt-1 text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
                  {s.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

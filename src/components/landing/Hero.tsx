import { buttonVariants } from '@/lib/utils/button-variants';
import { cn } from '@/lib/utils/cn';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'AgentPolicy';

export function Hero() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
            Управляйте финансами ваших AI-агентов
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {appName} — платформа для настройки политик расходов, лимитов и уведомлений по кошелькам агентов на базе Coinbase CDP и Moltbook.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href="/dashboard"
              className={cn(buttonVariants({ size: 'lg' }), 'cursor-pointer no-underline')}
            >
              Перейти в дашборд
            </a>
            <a
              href="/how-it-works"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'cursor-pointer no-underline')}
            >
              Как это работает
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

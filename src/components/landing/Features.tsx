import { Shield, Wallet, Bell, Sliders } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

type Lang = 'ru' | 'en';

const featuresByLang: Record<
  Lang,
  {
    title: string;
    subtitle: string;
    items: { title: string; description: string; icon: typeof Sliders }[];
  }
> = {
  ru: {
    title: 'Возможности платформы',
    subtitle:
      'Агенты торгуют на демо‑балансе, а вы управляете политиками, лимитами и уведомлениями в одном интерфейсе.',
    items: [
      {
        title: 'Политики и лимиты',
        description:
          'Дневные и недельные лимиты, максимум на сделку, разрешённые операции и активы.',
        icon: Sliders,
      },
      {
        title: 'Демо‑кошельки агентов',
        description:
          'Отдельный демо‑баланс для каждого агента, история операций и P&L по каждому.',
        icon: Wallet,
      },
      {
        title: 'Безопасные решения ИИ',
        description:
          'Каждое действие агента проходит проверку по политике перед исполнением.',
        icon: Shield,
      },
      {
        title: 'Telegram и отчёты',
        description:
          'Уведомления о сделках, ограничениях и сводные отчёты за период прямо в Telegram.',
        icon: Bell,
      },
    ],
  },
  en: {
    title: 'What the platform can do',
    subtitle:
      'Agents trade on a demo balance while you control policies, limits and notifications from one dashboard.',
    items: [
      {
        title: 'Policies & limits',
        description:
          'Daily/weekly limits, per‑trade caps, allowed operations and assets.',
        icon: Sliders,
      },
      {
        title: 'Per‑agent demo wallets',
        description:
          'Separate demo balance for each agent with full trade history and P&L.',
        icon: Wallet,
      },
      {
        title: 'Safe AI decisions',
        description:
          'Every action proposed by the agent is validated against your policy before execution.',
        icon: Shield,
      },
      {
        title: 'Telegram alerts & reports',
        description:
          'Trade alerts, limit breaches and periodic summaries delivered to Telegram.',
        icon: Bell,
      },
    ],
  },
};

export function Features({ lang }: { lang: Lang }) {
  const t = featuresByLang[lang] ?? featuresByLang.ru;

  return (
    <section className="py-20 dark:bg-zinc-900/50 sm:py-24">
      <div className="container px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {t.title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
          {t.subtitle}
        </p>
        <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:mt-16 sm:grid-cols-2 lg:grid-cols-4">
          {t.items.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <h3 className="mt-3 text-base font-semibold sm:text-lg">{f.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{f.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

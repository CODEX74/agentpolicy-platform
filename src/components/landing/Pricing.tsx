import { PRICING_PLANS } from '@/lib/constants/pricing';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card';

type Lang = 'ru' | 'en';

const pricingText: Record<Lang, { title: string; subtitle: string; choose: string; perMonth: string }> = {
  ru: {
    title: 'Тарифы',
    subtitle: 'Начните с бесплатного тарифа и подключите платный, когда будете готовы масштабировать агентов.',
    choose: 'Выбрать',
    perMonth: '/мес',
  },
  en: {
    title: 'Pricing',
    subtitle: 'Start on the free plan and upgrade when you are ready to scale the number of agents.',
    choose: 'Choose plan',
    perMonth: '/mo',
  },
};

export function Pricing({ lang }: { lang: Lang }) {
  const t = pricingText[lang] ?? pricingText.ru;

  return (
    <section className="py-20 dark:bg-zinc-900/50 sm:py-24">
      <div className="container px-4 sm:px-6 lg:px-8">
        <h2 className="text-center text-2xl font-bold text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {t.title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-zinc-600 sm:text-base dark:text-zinc-400">
          {t.subtitle}
        </p>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:mt-16 sm:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <h3 className="text-lg font-semibold sm:text-xl">{plan.name}</h3>
                <p className="text-2xl font-bold sm:text-3xl">
                  ${plan.price}
                  <span className="ml-1 text-sm font-normal text-zinc-500">{t.perMonth}</span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {plan.features.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  href="/dashboard"
                  className="w-full"
                  variant={plan.id === 'pro' ? 'default' : 'outline'}
                >
                  {t.choose}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

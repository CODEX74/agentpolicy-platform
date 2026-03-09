import { PRICING_PLANS } from '@/lib/constants/pricing';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/Card';

export function Pricing() {
  return (
    <section className="py-24 dark:bg-zinc-900/50">
      <div className="container">
        <h2 className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Тарифы
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-600 dark:text-zinc-400">
          Выберите план под ваши задачи.
        </p>
        <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="text-3xl font-bold">
                  ${plan.price}
                  <span className="text-sm font-normal text-zinc-500">/мес</span>
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
                <Button href="/dashboard" className="w-full" variant={plan.id === 'pro' ? 'default' : 'outline'}>
                  Выбрать
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

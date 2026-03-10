'use client';

import { useLang, type Lang } from '@/contexts/LanguageContext';
import { PRICING_PLANS } from '@/lib/constants/pricing';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

const t = {
  ru: { title: 'Оплата и подписка', perMonth: '/мес' },
  en: { title: 'Payment & subscription', perMonth: '/mo' },
};

const planFeatures: Record<string, Record<Lang, string[]>> = {
  free: {
    ru: ['До 2 агентов', 'Базовые политики', 'Email уведомления'],
    en: ['Up to 2 agents', 'Basic policies', 'Email notifications'],
  },
  pro: {
    ru: ['До 10 агентов', 'Расширенные политики', 'Telegram', 'Приоритетная поддержка'],
    en: ['Up to 10 agents', 'Advanced policies', 'Telegram', 'Priority support'],
  },
  enterprise: {
    ru: ['Безлимит агентов', 'API доступ', 'Кастомные интеграции', 'SLA'],
    en: ['Unlimited agents', 'API access', 'Custom integrations', 'SLA'],
  },
};

export function BillingPageContent() {
  const lang = useLang();
  const text = t[lang];

  return (
    <>
      <h1 className="text-2xl font-bold">{text.title}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-2xl font-bold">${plan.price}{text.perMonth}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {(planFeatures[plan.id]?.[lang] ?? plan.features).map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

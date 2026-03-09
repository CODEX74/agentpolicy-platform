export const PRICING_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    agentsLimit: 2,
    features: ['До 2 агентов', 'Базовые политики', 'Email уведомления'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    agentsLimit: 10,
    features: ['До 10 агентов', 'Расширенные политики', 'Telegram', 'Приоритетная поддержка'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    agentsLimit: -1,
    features: ['Безлимит агентов', 'API доступ', 'Кастомные интеграции', 'SLA'],
  },
] as const;

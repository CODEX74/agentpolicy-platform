import type { PolicyTemplate } from '@/types/policy';

export const POLICY_TEMPLATES: PolicyTemplate[] = [
  {
    id: 'conservative',
    name: 'Консервативная',
    description: 'Минимальные лимиты, только переводы',
    dailyLimit: 0.01,
    weeklyLimit: 0.05,
    maxPerTransaction: 0.005,
    allowedOperations: ['transfer'],
  },
  {
    id: 'standard',
    name: 'Стандартная',
    description: 'Умеренные лимиты, переводы и свопы',
    dailyLimit: 0.1,
    weeklyLimit: 0.5,
    maxPerTransaction: 0.05,
    allowedOperations: ['transfer', 'swap'],
  },
  {
    id: 'flexible',
    name: 'Гибкая',
    description: 'Все операции с лимитами',
    dailyLimit: 0.5,
    weeklyLimit: 2,
    maxPerTransaction: 0.2,
    allowedOperations: ['transfer', 'swap', 'nft', 'contract'],
  },
  {
    id: 'unrestricted',
    name: 'Без ограничений',
    description: 'Только уведомления',
    dailyLimit: 0,
    weeklyLimit: 0,
    maxPerTransaction: 0,
    allowedOperations: ['transfer', 'swap', 'nft', 'contract'],
  },
];

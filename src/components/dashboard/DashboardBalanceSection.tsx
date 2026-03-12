'use client';

import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AgentBalancesChart } from '@/components/dashboard/AgentBalancesChart';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useLang } from '@/contexts/LanguageContext';

const t = {
  ru: {
    loading: 'Загрузка баланса…',
    noData: 'Нет данных по балансу агентов',
    demoBalancePerAgent: 'Текущий демо-баланс по каждому агенту.',
  },
  en: {
    loading: 'Loading balance…',
    noData: 'No agent balance data',
    demoBalancePerAgent: 'Current demo balance per agent.',
  },
};

export function DashboardBalanceSection() {
  const lang = useLang();
  const text = t[lang];
  const { balanceHistory, agentBalances, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="mt-2 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">{text.loading}</p>
      </div>
    );
  }

  if (!balanceHistory.length && !agentBalances.length) {
    return (
      <div className="mt-2 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">{text.noData}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {balanceHistory.length > 0 && <BalanceChart data={balanceHistory} unit="USDT" />}
      {agentBalances.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
            {text.demoBalancePerAgent}
          </p>
          <AgentBalancesChart
            data={agentBalances.map((a) => ({
              agentId: a.agentId,
              name: a.name,
              value: a.demoBalance,
            }))}
            unit="USDT"
          />
        </div>
      )}
    </div>
  );
}


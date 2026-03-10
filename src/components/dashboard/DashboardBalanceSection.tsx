'use client';

import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AgentBalancesChart } from '@/components/dashboard/AgentBalancesChart';
import { useAnalytics } from '@/hooks/useAnalytics';

export function DashboardBalanceSection() {
  const { balanceHistory, agentBalances, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="mt-2 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">Загрузка баланса…</p>
      </div>
    );
  }

  if (!balanceHistory.length && !agentBalances.length) {
    return (
      <div className="mt-2 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">Нет данных по балансу агентов</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {balanceHistory.length > 0 && <BalanceChart data={balanceHistory} />}
      {agentBalances.length > 0 && (
        <div>
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">
            Текущий демо-баланс по каждому агенту.
          </p>
          <AgentBalancesChart data={agentBalances} />
        </div>
      )}
    </div>
  );
}


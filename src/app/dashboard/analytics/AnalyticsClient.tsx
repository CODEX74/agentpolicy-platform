'use client';

import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { useAnalytics } from '@/hooks/useAnalytics';

export function AnalyticsClient() {
  const { balanceHistory, isLoading } = useAnalytics();

  return (
    <>
      <h1 className="text-2xl font-bold">Аналитика</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Объём операций по дням (демо-транзакции агентов и операции из кошельков).
      </p>
      <div className="mt-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-zinc-500">Загрузка...</p>
          </div>
        ) : (
          <BalanceChart data={balanceHistory} />
        )}
      </div>
    </>
  );
}

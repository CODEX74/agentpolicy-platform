'use client';

import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AgentBalancesChart } from '@/components/dashboard/AgentBalancesChart';
import { AssetAllocationChart } from '@/components/dashboard/AssetAllocationChart';
import { PnlByAgentChart } from '@/components/dashboard/PnlByAgentChart';
import { useAnalytics } from '@/hooks/useAnalytics';

export function AnalyticsClient() {
  const { balanceHistory, agentBalances, assetAllocation, pnlByAgent, isLoading } = useAnalytics();

  return (
    <>
      <h1 className="text-2xl font-bold">Аналитика</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Демонстрационная аналитика по агентам: объём операций, балансы, распределение активов и P&amp;L.
      </p>

      {isLoading ? (
        <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500">Загрузка...</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-lg font-semibold">Объём операций по дням (USDT)</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Суммарный объём демо-операций агентов по дням за последние 14 дней.
            </p>
            <div className="mt-3">
              <BalanceChart data={balanceHistory} />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold">Балансы агентов (демо)</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Текущий демо-баланс каждого агента в USDT.
              </p>
              <div className="mt-3">
                <AgentBalancesChart data={agentBalances} />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Распределение активов</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Текущие позиции агентов по активам, оценённые по рыночной цене (демо).
              </p>
              <div className="mt-3">
                <AssetAllocationChart data={assetAllocation} />
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">P&amp;L агентов (все время)</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Суммарная разница между проданным и купленным объёмом в демо-режиме по каждому агенту.
            </p>
            <div className="mt-3">
              <PnlByAgentChart data={pnlByAgent} />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

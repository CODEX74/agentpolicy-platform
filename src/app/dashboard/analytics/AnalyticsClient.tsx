'use client';

import { useState } from 'react';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AgentBalancesChart } from '@/components/dashboard/AgentBalancesChart';
import { AssetAllocationChart } from '@/components/dashboard/AssetAllocationChart';
import { PnlByAgentChart } from '@/components/dashboard/PnlByAgentChart';
import { AgentBuysChart } from '@/components/dashboard/AgentBuysChart';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/Button';

export function AnalyticsClient() {
  const {
    balanceHistory,
    agentBalances,
    assetAllocationByAgent,
    pnlByAgent,
    buysByAgentOverTime,
    isLoading,
  } = useAnalytics();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadReport = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch('/api/analytics/report');
      if (!res.ok) {
        throw new Error('Не удалось сформировать отчёт');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'agent-analytics-report.docx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      // здесь можно позже добавить toast-уведомление
    } finally {
      setIsDownloading(false);
    }
  };

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
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Распределение активов по агентам</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Текущие демо-позиции каждого агента, оценённые по рыночной цене.
              </p>
              {assetAllocationByAgent.length === 0 ? (
                <div className="mt-3 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-zinc-500">Нет данных по позициям агентов</p>
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  {assetAllocationByAgent.map((a) => (
                    <div key={a.agentId} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                        {a.name}
                      </p>
                      <div className="mt-2">
                        <AssetAllocationChart data={a.assets} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

          <section className="pb-20 lg:pb-28 max-w-6xl mx-auto">
            <h2 className="text-lg font-semibold">Сумма на одну покупку по агентам</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Объём покупок в USDT по дням для каждого агента отдельно.
            </p>
            <div className="mt-3">
              <AgentBuysChart data={buysByAgentOverTime} />
            </div>
          </section>

          <div className="mt-10 pt-6 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={handleDownloadReport}
              disabled={isDownloading}
            >
              {isDownloading ? 'Формирование отчёта…' : 'Сформировать отчёт'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

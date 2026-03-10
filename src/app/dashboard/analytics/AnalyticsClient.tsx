'use client';

import { useState } from 'react';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AgentBalancesChart } from '@/components/dashboard/AgentBalancesChart';
import { AssetAllocationChart } from '@/components/dashboard/AssetAllocationChart';
import { PnlByAgentChart } from '@/components/dashboard/PnlByAgentChart';
import { AgentBuysChart } from '@/components/dashboard/AgentBuysChart';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Button } from '@/components/ui/Button';
import { useLang, type Lang } from '@/contexts/LanguageContext';

const t: Record<Lang, Record<string, string>> = {
  ru: {
    title: 'Аналитика',
    subtitle: 'Демонстрационная аналитика по агентам: объём операций, балансы, распределение активов и P&L.',
    loading: 'Загрузка...',
    volumeTitle: 'Объём операций по дням (USDT)',
    volumeSub: 'Суммарный объём демо-операций агентов по дням за последние 14 дней.',
    balancesTitle: 'Балансы агентов (демо)',
    balancesSub: 'Текущий демо-баланс каждого агента в USDT.',
    allocationTitle: 'Распределение активов по агентам',
    allocationSub: 'Текущие демо-позиции каждого агента, оценённые по рыночной цене.',
    noPositions: 'Нет данных по позициям агентов',
    pnlTitle: 'P&L агентов (все время)',
    pnlSub: 'Суммарная разница между проданным и купленным объёмом в демо-режиме по каждому агенту.',
    buysTitle: 'Сумма на одну покупку по агентам',
    buysSub: 'Объём покупок в USDT по дням для каждого агента отдельно.',
    generateReport: 'Сформировать отчёт',
    generating: 'Формирование отчёта…',
  },
  en: {
    title: 'Analytics',
    subtitle: 'Demo analytics per agent: transaction volume, balances, asset allocation and P&L.',
    loading: 'Loading...',
    volumeTitle: 'Transaction volume by day (USDT)',
    volumeSub: 'Total demo transaction volume by day over the last 14 days.',
    balancesTitle: 'Agent balances (demo)',
    balancesSub: 'Current demo balance per agent in USDT.',
    allocationTitle: 'Asset allocation by agent',
    allocationSub: 'Current demo positions per agent at market price.',
    noPositions: 'No agent position data',
    pnlTitle: 'Agent P&L (all time)',
    pnlSub: 'Total difference between sold and bought volume in demo mode per agent.',
    buysTitle: 'Amount per purchase by agents',
    buysSub: 'Purchase volume in USDT by day for each agent.',
    generateReport: 'Generate report',
    generating: 'Generating report…',
  },
};

export function AnalyticsClient() {
  const lang = useLang();
  const text = t[lang];
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
        throw new Error(text.generating);
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
      <h1 className="text-2xl font-bold">{text.title}</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{text.subtitle}</p>

      {isLoading ? (
        <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500">{text.loading}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-lg font-semibold">{text.volumeTitle}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{text.volumeSub}</p>
            <div className="mt-3">
              <BalanceChart data={balanceHistory} />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold">{text.balancesTitle}</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{text.balancesSub}</p>
              <div className="mt-3">
                <AgentBalancesChart data={agentBalances} />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{text.allocationTitle}</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{text.allocationSub}</p>
              {assetAllocationByAgent.length === 0 ? (
                <div className="mt-3 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-zinc-500">{text.noPositions}</p>
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  {assetAllocationByAgent.map((a) => (
                    <div key={a.agentId} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{a.name}</p>
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
            <h2 className="text-lg font-semibold">{text.pnlTitle}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{text.pnlSub}</p>
            <div className="mt-3">
              <PnlByAgentChart data={pnlByAgent} />
            </div>
          </section>

          <section className="mx-auto max-w-6xl pb-20">
            <h2 className="text-lg font-semibold">{text.buysTitle}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{text.buysSub}</p>
            <div className="mt-3">
              <AgentBuysChart data={buysByAgentOverTime} />
            </div>
          </section>

          <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <Button type="button" className="w-full sm:w-auto" onClick={handleDownloadReport} disabled={isDownloading}>
              {isDownloading ? text.generating : text.generateReport}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

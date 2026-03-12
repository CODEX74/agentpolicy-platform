'use client';

import { useState } from 'react';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AgentBalancesChart } from '@/components/dashboard/AgentBalancesChart';
import { AssetAllocationChart } from '@/components/dashboard/AssetAllocationChart';
import { PnlByAgentChart } from '@/components/dashboard/PnlByAgentChart';
import { AgentBuysChart } from '@/components/dashboard/AgentBuysChart';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useRealAnalytics } from '@/hooks/useRealAnalytics';
import { Button } from '@/components/ui/Button';
import { useLang, type Lang } from '@/contexts/LanguageContext';

const t: Record<
  Lang,
  {
    demoTitle: string;
    demoSubtitle: string;
    realTitle: string;
    realSubtitle: string;
    loading: string;
    volumeTitle: string;
    volumeSubDemo: string;
    volumeSubReal: string;
    balancesTitleDemo: string;
    balancesSubDemo: string;
    balancesTitleReal: string;
    balancesSubReal: string;
    allocationTitle: string;
    allocationSubDemo: string;
    allocationSubReal: string;
    noPositions: string;
    pnlTitle: string;
    pnlSubDemo: string;
    pnlSubReal: string;
    buysTitle: string;
    buysSubDemo: string;
    buysSubReal: string;
    generateReport: string;
    generating: string;
    tabDemo: string;
    tabReal: string;
  }
> = {
  ru: {
    demoTitle: 'Аналитика по демо-балансам',
    demoSubtitle:
      'Демонстрационная аналитика по агентам: объём операций, балансы, распределение активов и P&L в USDT.',
    realTitle: 'Аналитика по настоящим балансам',
    realSubtitle:
      'Аналитика по агентам с реальными кошельками: операции, балансы и распределение активов в ETH.',
    loading: 'Загрузка...',
    volumeTitle: 'Объём операций по дням',
    volumeSubDemo: 'Суммарный объём демо-операций агентов по дням за последние 14 дней (USDT).',
    volumeSubReal: 'Суммарный объём реальных операций агентов по дням за последние 14 дней (ETH).',
    balancesTitleDemo: 'Балансы агентов (демо)',
    balancesSubDemo: 'Текущий демо-баланс каждого агента в USDT.',
    balancesTitleReal: 'Балансы агентов (реальные кошельки)',
    balancesSubReal: 'Текущий on-chain баланс каждого агента в ETH.',
    allocationTitle: 'Распределение активов по агентам',
    allocationSubDemo: 'Текущие демо-позиции каждого агента, оценённые по рыночной цене (USDT).',
    allocationSubReal: 'Распределение реальных операций агентов по активам (в ETH).',
    noPositions: 'Нет данных по позициям агентов',
    pnlTitle: 'P&L агентов (все время)',
    pnlSubDemo:
      'Суммарная разница между проданным и купленным объёмом в демо-режиме по каждому агенту (USDT).',
    pnlSubReal:
      'Суммарная разница между проданным и купленным объёмом реальных сделок по каждому агенту (ETH, по текущему курсу).',
    buysTitle: 'Сумма на одну покупку по агентам',
    buysSubDemo: 'Объём покупок в USDT по дням для каждого агента.',
    buysSubReal: 'Объём реальных покупок в ETH по времени для каждого агента.',
    generateReport: 'Сформировать отчёт',
    generating: 'Формирование отчёта…',
    tabDemo: 'Аналитика по демо-балансам',
    tabReal: 'Аналитика по настоящим балансам',
  },
  en: {
    demoTitle: 'Demo balance analytics',
    demoSubtitle:
      'Demo analytics per agent: transaction volume, balances, asset allocation and P&L in USDT.',
    realTitle: 'Real balance analytics',
    realSubtitle:
      'Analytics for agents with real wallets: operations, balances and asset allocation in ETH.',
    loading: 'Loading...',
    volumeTitle: 'Transaction volume by day',
    volumeSubDemo: 'Total demo transaction volume by day over the last 14 days (USDT).',
    volumeSubReal: 'Total real transaction volume by day over the last 14 days (ETH).',
    balancesTitleDemo: 'Agent balances (demo)',
    balancesSubDemo: 'Current demo balance per agent in USDT.',
    balancesTitleReal: 'Agent balances (real wallets)',
    balancesSubReal: 'Current on-chain balance per agent in ETH.',
    allocationTitle: 'Asset allocation by agent',
    allocationSubDemo: 'Current demo positions per agent at market price (USDT).',
    allocationSubReal: 'Allocation of real operations per agent by asset (in ETH).',
    noPositions: 'No agent position data',
    pnlTitle: 'Agent P&L (all time)',
    pnlSubDemo: 'Total P&L in demo mode per agent (USDT).',
    pnlSubReal: 'Total P&L in real trades per agent (ETH, based on current rate).',
    buysTitle: 'Amount per purchase by agents',
    buysSubDemo: 'Purchase volume in USDT by day for each agent.',
    buysSubReal: 'Real purchase volume in ETH over time for each agent.',
    generateReport: 'Generate report',
    generating: 'Generating report…',
    tabDemo: 'Demo balance analytics',
    tabReal: 'Real balance analytics',
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
  const {
    balanceHistory: balanceHistoryReal,
    agentBalances: agentBalancesReal,
    assetAllocationByAgent: assetAllocationByAgentReal,
    pnlByAgent: pnlByAgentReal,
    buysByAgentOverTime: buysByAgentOverTimeReal,
    isLoading: isLoadingReal,
  } = useRealAnalytics();
  const [isDownloading, setIsDownloading] = useState(false);
  const [mode, setMode] = useState<'demo' | 'real'>('demo');

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
      <h1 className="text-2xl font-bold">
        {mode === 'demo' ? text.demoTitle : text.realTitle}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {mode === 'demo' ? text.demoSubtitle : text.realSubtitle}
      </p>

      <div className="mt-4 inline-flex rounded-lg border border-zinc-200 bg-zinc-100 p-1 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => setMode('demo')}
          className={`rounded-md px-3 py-1 transition ${
            mode === 'demo'
              ? 'bg-white text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {text.tabDemo}
        </button>
        <button
          type="button"
          onClick={() => setMode('real')}
          className={`ml-1 rounded-md px-3 py-1 transition ${
            mode === 'real'
              ? 'bg-white text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          {text.tabReal}
        </button>
      </div>

      {(mode === 'demo' ? isLoading : isLoadingReal) ? (
        <div className="mt-6 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-500">{text.loading}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <section>
            <h2 className="text-lg font-semibold">{text.volumeTitle}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {mode === 'demo' ? text.volumeSubDemo : text.volumeSubReal}
            </p>
            <div className="mt-3">
              <BalanceChart
                data={mode === 'demo' ? balanceHistory : balanceHistoryReal}
                unit={mode === 'demo' ? 'USDT' : 'ETH'}
              />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold">
                {mode === 'demo' ? text.balancesTitleDemo : text.balancesTitleReal}
              </h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {mode === 'demo' ? text.balancesSubDemo : text.balancesSubReal}
              </p>
              <div className="mt-3">
                <AgentBalancesChart
                  data={(
                    mode === 'demo' ? agentBalances : agentBalancesReal
                  ).map((a: any) => ({
                    agentId: a.agentId,
                    name: a.name,
                    value: mode === 'demo' ? a.demoBalance : a.balanceEth,
                  }))}
                  unit={mode === 'demo' ? 'USDT' : 'ETH'}
                />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">{text.allocationTitle}</h2>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {mode === 'demo' ? text.allocationSubDemo : text.allocationSubReal}
              </p>
              {(mode === 'demo' ? assetAllocationByAgent : assetAllocationByAgentReal).length === 0 ? (
                <div className="mt-3 flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-zinc-500">{text.noPositions}</p>
                </div>
              ) : (
                <div className="mt-3 space-y-4">
                  {(mode === 'demo' ? assetAllocationByAgent : assetAllocationByAgentReal).map(
                    (a: any) => (
                      <div
                        key={a.agentId}
                        className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                      >
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          {a.name}
                        </p>
                        <div className="mt-2">
                          <AssetAllocationChart
                            data={a.assets.map((asset: any) => ({
                              asset: asset.asset,
                              value: asset.valueUsd ?? asset.value,
                            }))}
                            unit={mode === 'demo' ? 'USDT' : 'ETH'}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{text.pnlTitle}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {mode === 'demo' ? text.pnlSubDemo : text.pnlSubReal}
            </p>
            <div className="mt-3">
              <PnlByAgentChart
                data={mode === 'demo' ? pnlByAgent : pnlByAgentReal}
                unit={mode === 'demo' ? 'USDT' : 'ETH'}
              />
            </div>
          </section>

          <section className="mx-auto max-w-6xl pb-20">
            <h2 className="text-lg font-semibold">{text.buysTitle}</h2>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {mode === 'demo' ? text.buysSubDemo : text.buysSubReal}
            </p>
            <div className="mt-3">
              <AgentBuysChart
                data={mode === 'demo' ? buysByAgentOverTime : buysByAgentOverTimeReal}
                unit={mode === 'demo' ? 'USDT' : 'ETH'}
              />
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

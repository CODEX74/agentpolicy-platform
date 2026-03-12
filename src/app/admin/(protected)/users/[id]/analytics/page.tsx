'use client';

import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AgentBalancesChart } from '@/components/dashboard/AgentBalancesChart';
import { AssetAllocationChart } from '@/components/dashboard/AssetAllocationChart';
import { PnlByAgentChart } from '@/components/dashboard/PnlByAgentChart';
import { AgentBuysChart } from '@/components/dashboard/AgentBuysChart';
import { Button } from '@/components/ui/Button';

interface AdminAnalyticsResponse {
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  balanceHistory: { date: string; balance: number }[];
  agentBalances: { agentId: string; name: string; demoBalance: number }[];
  assetAllocationByAgent: {
    agentId: string;
    name: string;
    assets: { asset: string; valueUsd: number }[];
  }[];
  pnlByAgent: { agentId: string; name: string; pnlTotal: number }[];
  buysByAgentOverTime: {
    agentId: string;
    name: string;
    date: string;
    buyAmount: number;
  }[];
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Ошибка загрузки');
    return res.json() as Promise<AdminAnalyticsResponse>;
  });

export default function AdminUserAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const { data, error, isLoading } = useSWR<AdminAnalyticsResponse>(
    id ? `/api/admin/users/${id}/analytics` : null,
    fetcher
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <p className="text-xs text-zinc-500">Админ-панель / Аналитика пользователя</p>
          <h1 className="text-xl font-semibold">
            {data?.user.email || 'Пользователь'}
          </h1>
          <p className="text-sm text-zinc-400">
            ID: {data?.user.id ?? id} · Имя: {data?.user.name || '—'}
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Назад к пользователям
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {isLoading && <p className="text-sm text-zinc-400">Загрузка аналитики…</p>}
        {error && (
          <p className="text-sm text-red-400">
            Не удалось загрузить аналитику. Перезагрузите страницу.
          </p>
        )}

        {data && !error && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold">Объём операций по дням (USDT)</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Суммарный объём демо-операций по дням за последние 14 дней.
              </p>
              <div className="mt-3">
                <BalanceChart data={data.balanceHistory} />
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold">Балансы агентов (демо)</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Текущий демо-баланс каждого агента в USDT.
                </p>
                <div className="mt-3">
                  <AgentBalancesChart
                    data={data.agentBalances.map((a: any) => ({
                      agentId: a.agentId,
                      name: a.name,
                      value: a.demoBalance,
                    }))}
                    unit="USDT"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Распределение активов по агентам</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Текущие демо-позиции каждого агента, оценённые по рыночной цене.
                </p>
                {data.assetAllocationByAgent.length === 0 ? (
                  <div className="mt-3 flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
                    <p className="text-zinc-500">Нет данных по позициям агентов</p>
                  </div>
                ) : (
                  <div className="mt-3 space-y-4">
                    {data.assetAllocationByAgent.map((a) => (
                      <div
                        key={a.agentId}
                        className="rounded-lg border border-zinc-800 p-3"
                      >
                        <p className="text-sm font-medium text-zinc-50">
                          {a.name}
                        </p>
                        <div className="mt-2 h-64">
                          <AssetAllocationChart
                            data={a.assets.map((asset: any) => ({
                              asset: asset.asset,
                              value: asset.valueUsd,
                            }))}
                            unit="USDT"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold">P&L агентов (все время)</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Суммарная разница между проданным и купленным объёмом в демо-режиме по каждому агенту.
              </p>
              <div className="mt-3">
                <PnlByAgentChart data={data.pnlByAgent} unit="USDT" />
              </div>
            </section>

            <section>
              <h2 className="text-lg font-semibold">Сумма на одну покупку по агентам</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Объём покупок в USDT по дням для каждого агента отдельно.
              </p>
              <div className="mt-3">
                <AgentBuysChart data={data.buysByAgentOverTime} unit="USDT" />
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}


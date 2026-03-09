'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils/format';

interface DemoTx {
  _id: string;
  type: string;
  amountEth: number;
  reason: string;
  marketPriceUsd?: number;
  asset?: string;
  priceReason?: string;
  termDays?: number;
  plans?: string;
  assetPriceUsd?: number;
  createdAt: string;
}

interface DemoPosition {
  asset: string;
  quantity: number;
  totalUsdSpent: number;
  avgPriceUsd: number;
}

interface AgentDemoCardProps {
  agentId: string;
}

export function AgentDemoCard({ agentId }: AgentDemoCardProps) {
  const [demoBalance, setDemoBalance] = useState<number | null>(null);
  const [positions, setPositions] = useState<DemoPosition[]>([]);
  const [run24_7, setRun24_7] = useState<boolean>(false);
  const [demoSupported, setDemoSupported] = useState<boolean | null>(null);
  const [inputBalance, setInputBalance] = useState('');
  const [transactions, setTransactions] = useState<DemoTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [run24_7Loading, setRun24_7Loading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/demo-balance`);
      if (res.ok) {
        const data = await res.json();
        setDemoBalance(data.demoBalance ?? 0);
        setPositions(Array.isArray(data.positions) ? data.positions : []);
        setRun24_7(data.run24_7 ?? false);
        setDemoSupported(true);
      } else {
        setDemoBalance(null);
        setDemoSupported(res.status === 404 ? false : true);
      }
    } catch {
      setDemoBalance(null);
      setDemoSupported(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`/api/agents/${agentId}/demo-transactions`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : []);
      }
    } catch {
      setTransactions([]);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [agentId]);

  useEffect(() => {
    if (demoSupported) fetchTransactions();
  }, [agentId, demoSupported]);

  const handleSetBalance = async () => {
    const num = parseFloat(inputBalance.replace(',', '.'));
    if (Number.isNaN(num) || num < 0) {
      setError('Введите положительное число');
      return;
    }
    setError(null);
    setMessage(null);
    setActionLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/demo-balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demoBalance: num }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === 'string' ? data.error : 'Не удалось установить баланс');
        return;
      }
      const data = await res.json();
      setDemoBalance(data.demoBalance ?? 0);
      setInputBalance('');
      setMessage('Демо-баланс обновлён');
      await fetchTransactions();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRun = async () => {
    setError(null);
    setMessage(null);
    setRunLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/run`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === 'string' ? data.error : 'Ошибка запуска агента');
        return;
      }
      setMessage(
        data.action === 'hold'
          ? `Держать. ${data.reason ?? ''}`
          : `Выполнено: ${data.action}${data.amountEth != null ? ` ${data.amountEth} USDT` : ''}. ${data.reason ?? ''}`
      );
      if (data.demoBalance != null) setDemoBalance(data.demoBalance);
      await fetchBalance();
      await fetchTransactions();
    } finally {
      setRunLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-zinc-500">Загрузка...</p>
        </CardContent>
      </Card>
    );
  }

  if (demoSupported === false) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Демо-режим агента</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Демо-баланс и автономные решения ИИ доступны только для агентов с локальным хранилищем (без MongoDB).
          </p>
        </CardContent>
      </Card>
    );
  }

  const balance = demoBalance ?? 0;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-medium">Демо-режим: нейросеть и баланс</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Задайте виртуальный баланс в USDT. Агент на основе политики и «рынка» сам решает: купить USDT, перевести или держать. Траты списываются с демо-баланса.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Демо-баланс: {balance} USDT</span>
        </div>
        {positions.length > 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <h4 className="mb-2 text-sm font-medium">Позиции (купленная крипта)</h4>
            <ul className="space-y-1.5 text-sm">
              {positions.map((p) => (
                <li key={p.asset} className="flex justify-between gap-2">
                  <span className="font-medium">{p.asset}</span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {p.quantity < 0.01 ? p.quantity.toExponential(2) : p.quantity.toFixed(4)} · ${p.avgPriceUsd.toFixed(0)} ≈ ${p.totalUsdSpent.toFixed(0)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.5"
            value={inputBalance}
            onChange={(e) => setInputBalance(e.target.value)}
            disabled={actionLoading}
            className="w-28"
          />
          <Button
            type="button"
            size="sm"
            disabled={actionLoading || !inputBalance.trim()}
            onClick={handleSetBalance}
          >
            Установить баланс
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="sm"
            disabled={runLoading || balance <= 0}
            onClick={handleRun}
          >
            {runLoading ? 'Запуск...' : 'Запустить агента (решение ИИ)'}
          </Button>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={run24_7}
              disabled={run24_7Loading || balance <= 0}
              onChange={async (e) => {
                const v = e.target.checked;
                setRun24_7Loading(true);
                setError(null);
                try {
                  const res = await fetch(`/api/agents/${agentId}/run24_7`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ run24_7: v }),
                  });
                  if (!res.ok) {
                    const d = await res.json().catch(() => ({}));
                    setError(typeof d?.error === 'string' ? d.error : 'Не удалось изменить настройку');
                    return;
                  }
                  const data = await res.json();
                  setRun24_7(data.run24_7 ?? false);
                } finally {
                  setRun24_7Loading(false);
                }
              }}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600"
            />
            <span>Работать 24/7</span>
          </label>
        </div>
        {run24_7 && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Локально: в отдельном терминале запустите <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">npm run cron</code> — тогда каждые 5 мин будет вызываться крон и в Telegram станут приходить отчёты. На Vercel крон запускается сам. Нужны CRON_SECRET, TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.local.
          </p>
        )}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          ИИ: ключ на <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com/keys</a> (gsk_...) → в .env.local строка <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">GROQ_API_KEY=gsk_...</code> без кавычек. После изменения перезапустите сервер.
        </p>

        {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        {transactions.length > 0 && (
          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
            <h4 className="mb-2 text-sm font-medium">Демо-транзакции</h4>
            <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
              {transactions.slice(0, 20).map((tx) => (
                <li key={tx._id} className="rounded bg-zinc-100 px-2 py-1 dark:bg-zinc-800">
                  <span className="font-medium capitalize">{tx.type}</span>
                  {tx.amountEth > 0 && ` · ${tx.amountEth} USDT`}
                  {tx.asset && ` · ${tx.asset}`}
                  {tx.marketPriceUsd != null && ` · $${tx.marketPriceUsd}`}
                  <br />
                  <span className="text-zinc-500">{tx.reason}</span>
                  {tx.assetPriceUsd != null && tx.asset && <><br /><span className="text-zinc-400 text-xs">Цена покупки: ${tx.assetPriceUsd} ({tx.asset})</span></>}
                  {tx.priceReason && <><br /><span className="text-zinc-400 text-xs">Обоснование цены: {tx.priceReason}</span></>}
                  {tx.termDays != null && <span className="text-zinc-400 text-xs"> · Срок: {tx.termDays} дн.</span>}
                  {tx.plans && <><br /><span className="text-zinc-400 text-xs">Планы: {tx.plans}</span></>}
                  <br />
                  <span className="text-xs text-zinc-400">{formatDate(tx.createdAt)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

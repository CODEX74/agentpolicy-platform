'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/contexts/LanguageContext';
import type { Lang } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/Button';

type PendingItem = {
  id: string;
  fromAddress: string;
  toAddress: string;
  valueWei: string;
  data: string | null;
  networkId: string;
  asset: string;
  amountUsd: number;
  reason: string | null;
  status: string;
  createdAt: string;
};

const t = {
  ru: {
    title: 'Ожидающие подписи',
    empty: 'Нет ожидающих транзакций.',
    sign: 'Подписать и отправить',
    signing: 'Открытие кошелька…',
    done: 'Отправлено',
    errorNoWallet: 'Установите MetaMask или другой кошелёк и подключите его к сайту.',
    errorSign: 'Ошибка подписи или отправки',
    amount: 'Сумма',
    reason: 'Причина',
  },
  en: {
    title: 'Pending signatures',
    empty: 'No pending transactions.',
    sign: 'Sign and send',
    signing: 'Opening wallet…',
    done: 'Sent',
    errorNoWallet: 'Install MetaMask or another wallet and connect it to this site.',
    errorSign: 'Sign or send failed',
    amount: 'Amount',
    reason: 'Reason',
  },
};

export function PendingRealTransactions({ agentId }: { agentId: string }) {
  const lang = useLang();
  const text = t[lang as Lang];
  const [list, setList] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/pending-transactions`);
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [agentId]);

  const handleSign = async (p: PendingItem) => {
    const ethereum = typeof window !== 'undefined' ? (window as unknown as { ethereum?: { request: (args: unknown) => Promise<unknown> } }).ethereum : null;
    if (!ethereum?.request) {
      setError(text.errorNoWallet);
      return;
    }
    setSigningId(p.id);
    setError(null);
    try {
      const chainIdHex = p.networkId === 'base' ? '0x2105' : p.networkId === 'base-sepolia' ? '0x14a34' : undefined;
      if (chainIdHex) {
        try {
          await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
        } catch {
          // chain may already be selected or user rejected
        }
      }
      const txHash = (await ethereum.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: p.fromAddress,
            to: p.toAddress,
            value: `0x${BigInt(p.valueWei).toString(16)}`,
            data: p.data || undefined,
          },
        ],
      })) as string;
      if (!txHash || typeof txHash !== 'string') throw new Error('No txHash');
      const patchRes = await fetch(`/api/agents/${agentId}/pending-transactions/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash }),
      });
      if (!patchRes.ok) throw new Error('Failed to save');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : text.errorSign);
    } finally {
      setSigningId(null);
    }
  };

  if (loading) return <p className="text-xs text-zinc-500">{lang === 'ru' ? 'Загрузка…' : 'Loading…'}</p>;
  if (list.length === 0) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{text.empty}</p>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{text.title}</h4>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <ul className="space-y-2">
        {list.map((p) => (
          <li
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <div className="text-xs">
              <span className="font-medium">{text.amount}: </span>
              {p.amountUsd} {p.asset}
              {p.reason && (
                <>
                  {' · '}
                  <span className="text-zinc-500">{text.reason}: {p.reason}</span>
                </>
              )}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => handleSign(p)}
              disabled={signingId !== null}
            >
              {signingId === p.id ? text.signing : text.sign}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

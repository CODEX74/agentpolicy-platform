'use client';

import { formatDate, formatAddress } from '@/lib/utils/format';
import { useLang, type Lang } from '@/contexts/LanguageContext';

interface Tx {
  _id: string;
  type: string;
  amount: number;
  currency: string;
  toAddress?: string | null;
  status: string;
  createdAt: string;
  isDemo?: boolean;
  reason?: string;
  asset?: string;
  priceReason?: string;
  termDays?: number;
  plans?: string;
  assetPriceUsd?: number;
}

const typeLabels: Record<Lang, Record<string, string>> = {
  ru: { hold: 'Держать', buy_coin: 'Покупка', sell_coin: 'Продажа', transfer: 'Перевод' },
  en: { hold: 'Hold', buy_coin: 'Buy', sell_coin: 'Sell', transfer: 'Transfer' },
};

const t = {
  ru: {
    empty: 'Нет транзакций',
    type: 'Тип',
    amount: 'Сумма',
    to: 'Кому',
    status: 'Статус',
    date: 'Дата',
    reason: 'Причина / источник',
    demo: 'Демо',
    demoReason: 'Демо-баланс агента',
    asset: 'Актив',
    price: 'Цена',
    termDays: 'дн.',
    plans: 'Планы',
  },
  en: {
    empty: 'No transactions',
    type: 'Type',
    amount: 'Amount',
    to: 'To',
    status: 'Status',
    date: 'Date',
    reason: 'Reason / source',
    demo: 'Demo',
    demoReason: 'Agent demo balance',
    asset: 'Asset',
    price: 'Price',
    termDays: 'd',
    plans: 'Plans',
  },
};

function formatTxType(type: string, lang: Lang): string {
  const key = type.toLowerCase();
  return typeLabels[lang][key] ?? type;
}

export function TransactionTable({ transactions }: { transactions: Tx[] }) {
  const lang = useLang();
  const text = t[lang];

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 p-8 text-center text-zinc-500 dark:border-zinc-800">
        {text.empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left font-medium">{text.type}</th>
            <th className="px-4 py-3 text-left font-medium">{text.amount}</th>
            <th className="px-4 py-3 text-left font-medium">{text.to}</th>
            <th className="px-4 py-3 text-left font-medium">{text.status}</th>
            <th className="px-4 py-3 text-left font-medium">{text.date}</th>
            <th className="px-4 py-3 text-left font-medium">{text.reason}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {transactions.map((tx) => (
            <tr key={tx._id}>
              <td className="px-4 py-3">{formatTxType(tx.type, lang)}</td>
              <td className="px-4 py-3">{tx.amount} {tx.currency}</td>
              <td className="px-4 py-3 font-mono text-xs">{tx.toAddress ? formatAddress(tx.toAddress) : '—'}</td>
              <td className="px-4 py-3">{tx.isDemo ? text.demo : tx.status}</td>
              <td className="px-4 py-3 text-zinc-500">{formatDate(tx.createdAt)}</td>
              <td className="max-w-sm px-4 py-3 text-zinc-500">
                {tx.isDemo ? (
                  <span className="block max-w-xs truncate" title={[tx.reason, tx.asset && `${text.asset}: ${tx.asset}`, tx.assetPriceUsd != null && `${text.price}: $${tx.assetPriceUsd}`, tx.priceReason, tx.termDays != null && `${tx.termDays} ${text.termDays}`, tx.plans].filter(Boolean).join('\n')}>
                    {tx.reason ?? text.demoReason}
                    {tx.asset && <span className="ml-1 text-zinc-400">· {tx.asset}</span>}
                    {tx.assetPriceUsd != null && <span className="ml-1 text-zinc-400">· ${tx.assetPriceUsd}</span>}
                    {tx.termDays != null && <span className="ml-1 text-zinc-400">· {tx.termDays} {text.termDays}</span>}
                    {tx.priceReason && <span className="block truncate text-xs"> {tx.priceReason}</span>}
                    {tx.plans && <span className="block truncate text-xs text-zinc-400">{text.plans}: {tx.plans}</span>}
                  </span>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

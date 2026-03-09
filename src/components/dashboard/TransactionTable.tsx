'use client';

import { formatDate, formatAddress } from '@/lib/utils/format';

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

export function TransactionTable({ transactions }: { transactions: Tx[] }) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 p-8 text-center text-zinc-500 dark:border-zinc-800">
        Нет транзакций
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Тип</th>
            <th className="px-4 py-3 text-left font-medium">Сумма</th>
            <th className="px-4 py-3 text-left font-medium">Кому</th>
            <th className="px-4 py-3 text-left font-medium">Статус</th>
            <th className="px-4 py-3 text-left font-medium">Дата</th>
            <th className="px-4 py-3 text-left font-medium">Причина / источник</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {transactions.map((tx) => (
            <tr key={tx._id}>
              <td className="px-4 py-3 capitalize">{tx.type}</td>
              <td className="px-4 py-3">{tx.amount} {tx.currency}</td>
              <td className="px-4 py-3 font-mono text-xs">{tx.toAddress ? formatAddress(tx.toAddress) : '—'}</td>
              <td className="px-4 py-3">{tx.isDemo ? 'Демо' : tx.status}</td>
              <td className="px-4 py-3 text-zinc-500">{formatDate(tx.createdAt)}</td>
              <td className="max-w-sm px-4 py-3 text-zinc-500">
                {tx.isDemo ? (
                  <span className="block max-w-xs truncate" title={[tx.reason, tx.asset && `Актив: ${tx.asset}`, tx.assetPriceUsd != null && `Цена: $${tx.assetPriceUsd}`, tx.priceReason, tx.termDays != null && `Срок: ${tx.termDays} дн.`, tx.plans].filter(Boolean).join('\n')}>
                    {tx.reason ?? 'Демо-баланс агента'}
                    {tx.asset && <span className="ml-1 text-zinc-400">· {tx.asset}</span>}
                    {tx.assetPriceUsd != null && <span className="ml-1 text-zinc-400">· ${tx.assetPriceUsd}</span>}
                    {tx.termDays != null && <span className="ml-1 text-zinc-400">· {tx.termDays} дн.</span>}
                    {tx.priceReason && <span className="block truncate text-xs"> {tx.priceReason}</span>}
                    {tx.plans && <span className="block truncate text-xs text-zinc-400">Планы: {tx.plans}</span>}
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

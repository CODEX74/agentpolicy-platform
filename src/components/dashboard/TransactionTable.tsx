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
  amountUsd?: number;
}

const typeLabels: Record<Lang, Record<string, string>> = {
  ru: { hold: 'Держать', buy_coin: 'Покупка', sell_coin: 'Продажа', transfer: 'Перевод' },
  en: { hold: 'Hold', buy_coin: 'Buy', sell_coin: 'Sell', transfer: 'Transfer' },
};

const t = {
  ru: {
    empty: 'Нет транзакций',
    type: 'Тип',
    quantity: 'Количество монет',
    priceUsdt: 'Цена в USDT',
    term: 'Срок покупки',
    date: 'Дата',
    reason: 'Причина',
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
    quantity: 'Quantity',
    priceUsdt: 'Price in USDT',
    term: 'Purchase term',
    date: 'Date',
    reason: 'Reason',
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

function formatAmount(value: number, decimals = 6): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1e6 || (value > 0 && value < 1e-4)) return value.toExponential(2);
  return value.toFixed(decimals).replace(/\.?0+$/, '') || '0';
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
            <th className="px-4 py-3 text-left font-medium">{text.quantity}</th>
            <th className="px-4 py-3 text-left font-medium">{text.priceUsdt}</th>
            <th className="px-4 py-3 text-left font-medium">{text.term}</th>
            <th className="px-4 py-3 text-left font-medium">{text.reason}</th>
            <th className="px-4 py-3 text-left font-medium">{text.date}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {transactions.map((tx) => {
            const priceUsdt = tx.amountUsd != null ? tx.amountUsd : (tx.isDemo ? tx.amount : undefined);
            const quantityStr = `${formatAmount(tx.amount)} ${tx.asset || tx.currency}`;
            return (
              <tr key={tx._id}>
                <td className="px-4 py-3">{formatTxType(tx.type, lang)}</td>
                <td className="px-4 py-3 font-mono text-xs">{quantityStr}</td>
                <td className="px-4 py-3">{priceUsdt != null ? `$${formatAmount(priceUsdt, 2)}` : '—'}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {tx.termDays != null ? `${tx.termDays} ${text.termDays}` : '—'}
                </td>
                <td className="max-w-xs px-4 py-3 text-zinc-500">
                  {tx.isDemo ? (
                    <span className="block truncate" title={[tx.reason, tx.priceReason, tx.plans].filter(Boolean).join('\n')}>
                      {tx.reason ?? text.demoReason}
                      {tx.asset && <span className="ml-1 text-zinc-400">· {tx.asset}</span>}
                      {tx.termDays != null && <span className="ml-1 text-zinc-400">· {tx.termDays} {text.termDays}</span>}
                    </span>
                  ) : (
                    <span className="block truncate" title={tx.reason ?? ''}>{tx.reason ?? '—'}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(tx.createdAt, lang === 'en' ? 'en-US' : 'ru-RU')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

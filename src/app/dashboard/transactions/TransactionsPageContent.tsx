'use client';

import Link from 'next/link';
import { useLang, withLang } from '@/contexts/LanguageContext';
import { TransactionTable } from '@/components/dashboard/TransactionTable';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

const t = {
  ru: {
    title: 'Транзакции',
    whenTitle: 'Когда появятся транзакции?',
    intro: 'Транзакции в списке:',
    item1: 'каждый запуск агента (ручной или по крону 24/7): hold, buy_coin, sell_coin, transfer и т.д. Отображаются со статусом «Демо».',
    item2: 'Отправка через приложение — кошелёк (CDP), привязка к агенту, перевод через',
    item3: 'События от CDP — вебхук',
    item3b: ', события',
    item3c: 'transaction.completed',
    demoNote: 'Демо-транзакции агентов отображаются выше. Для реальных переводов нужны CDP-ключи в',
    agents: 'Агенты',
    dashboard: 'Дашборд',
  },
  en: {
    title: 'Transactions',
    whenTitle: 'When will transactions appear?',
    intro: 'Transactions in the list:',
    item1: 'each agent run (manual or 24/7 cron): hold, buy_coin, sell_coin, transfer, etc. Shown with "Demo" status.',
    item2: 'Sending via app — wallet (CDP), link to agent, transfer via',
    item3: 'Events from CDP — webhook',
    item3b: ', events',
    item3c: 'transaction.completed',
    demoNote: 'Agent demo transactions appear above. For real transfers you need CDP keys in',
    agents: 'Agents',
    dashboard: 'Dashboard',
  },
};

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

export function TransactionsPageContent({ transactions }: { transactions: Tx[] }) {
  const lang = useLang();
  const text = t[lang];
  const codeClass = 'rounded bg-zinc-200 px-1 dark:bg-zinc-700';

  return (
    <>
      <h1 className="text-2xl font-bold">{text.title}</h1>
      <div className="mt-6">
        <TransactionTable transactions={transactions} />
      </div>
      {transactions.length === 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-medium">{text.whenTitle}</h3>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p>{text.intro}</p>
            <ol className="list-inside list-decimal space-y-1">
              <li><strong>{lang === 'ru' ? 'Действия агента с демо-балансом' : 'Agent demo actions'}</strong> — {text.item1}</li>
              <li><strong>{lang === 'ru' ? 'Отправка через приложение' : 'App transfer'}</strong> — {text.item2} <code className={codeClass}>POST /api/wallets/transaction</code>.</li>
              <li><strong>{lang === 'ru' ? 'События от CDP' : 'CDP events'}</strong> — {text.item3} <code className={codeClass}>/api/webhook/cdp</code>{text.item3b} <code className={codeClass}>{text.item3c}</code>.</li>
            </ol>
            <p>{text.demoNote} <code className={codeClass}>.env.local</code>.</p>
            <p>
              <Link href={withLang('/dashboard/agents', lang)} className="underline hover:no-underline">{text.agents}</Link>
              {' · '}
              <Link href={withLang('/dashboard', lang)} className="underline hover:no-underline">{text.dashboard}</Link>
            </p>
          </CardContent>
        </Card>
      )}
    </>
  );
}

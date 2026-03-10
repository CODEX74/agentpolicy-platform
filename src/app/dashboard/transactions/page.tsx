import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TransactionTable } from '@/components/dashboard/TransactionTable';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { getMergedTransactionsForEmail } from '@/lib/transactions-merged';

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  let transactions: unknown[] = [];
  try {
    transactions = await getMergedTransactionsForEmail(session.user.email, 100);
  } catch {
    transactions = [];
  }

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Транзакции</h1>
      <div className="mt-6">
        <TransactionTable transactions={transactions as never[]} />
      </div>
      {(transactions as unknown[]).length === 0 && (
        <Card className="mt-6">
          <CardHeader>
            <h3 className="text-lg font-medium">Когда появятся транзакции?</h3>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p>Транзакции в списке:</p>
            <ol className="list-inside list-decimal space-y-1">
              <li>
                <strong>Действия агента с демо-балансом</strong> — каждый запуск агента (ручной или по крону 24/7): hold, buy_coin, sell_coin, transfer и т.д. Отображаются со статусом «Демо».
              </li>
              <li>
                <strong>Отправка через приложение</strong> — кошелёк (CDP), привязка к агенту, перевод через <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">POST /api/wallets/transaction</code>.
              </li>
              <li>
                <strong>События от CDP</strong> — вебхук <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">/api/webhook/cdp</code>, события <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">transaction.completed</code>.
              </li>
            </ol>
            <p>
              Демо-транзакции агентов отображаются выше. Для реальных переводов нужны CDP-ключи в <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">.env.local</code>.
            </p>
            <p>
              <Link href="/dashboard/agents" className="underline hover:no-underline">
                Агенты
              </Link>
              {' · '}
              <Link href="/dashboard" className="underline hover:no-underline">
                Дашборд
              </Link>
            </p>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}

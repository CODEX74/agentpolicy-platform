import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TransactionsPageContent } from './TransactionsPageContent';
import { getMergedTransactionsForEmail, getRealTransactionsForEmail } from '@/lib/transactions-merged';

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  let demoTransactions: unknown[] = [];
  let realTransactions: unknown[] = [];
  try {
    const [demo, real] = await Promise.all([
      getMergedTransactionsForEmail(session.user.email, 100),
      getRealTransactionsForEmail(session.user.email, 100),
    ]);
    demoTransactions = demo;
    realTransactions = real;
  } catch {
    demoTransactions = [];
    realTransactions = [];
  }

  return (
    <DashboardLayout>
      <TransactionsPageContent
        demoTransactions={demoTransactions as never[]}
        realTransactions={realTransactions as never[]}
      />
    </DashboardLayout>
  );
}

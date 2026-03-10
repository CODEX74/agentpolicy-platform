import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TransactionsPageContent } from './TransactionsPageContent';
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
      <TransactionsPageContent transactions={transactions as never[]} />
    </DashboardLayout>
  );
}

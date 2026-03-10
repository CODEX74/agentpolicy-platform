import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BillingPageContent } from './BillingPageContent';

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  return (
    <DashboardLayout>
      <BillingPageContent />
    </DashboardLayout>
  );
}

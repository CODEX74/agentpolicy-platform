import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AnalyticsClient } from './AnalyticsClient';

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  return (
    <DashboardLayout>
      <AnalyticsClient />
    </DashboardLayout>
  );
}

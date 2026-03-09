import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateAgentForm } from './CreateAgentForm';

export default async function CreateAgentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  return (
    <DashboardLayout>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">Добавить агента</h1>
        <CreateAgentForm />
      </div>
    </DashboardLayout>
  );
}

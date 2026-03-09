import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentList } from '@/components/dashboard/AgentList';
import { Button } from '@/components/ui/Button';
import { getFileAgentsByEmail } from '@/lib/db/file-agents';

export default async function AgentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const agents = await getFileAgentsByEmail(session.user.email);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Агенты</h1>
        <Button href="/dashboard/agents/create">Добавить агента</Button>
      </div>
      <div className="mt-6">
        <AgentList agents={agents as never[]} />
      </div>
    </DashboardLayout>
  );
}

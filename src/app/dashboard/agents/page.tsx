import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentList } from '@/components/dashboard/AgentList';
import { Button } from '@/components/ui/Button';
import { prisma } from '@/lib/db/prisma';

export default async function AgentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { agents: { orderBy: { createdAt: 'desc' } } },
  });
  const agents = user?.agents ?? [];

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Агенты</h1>
        <Button href="/dashboard/agents/create">Добавить агента</Button>
      </div>
      <div className="mt-6">
        <AgentList agents={agents.map((a) => ({ _id: a.id, name: a.name, description: a.description ?? '', isActive: a.isActive, walletId: a.walletId ?? undefined, walletAddress: a.walletAddress ?? undefined, demoBalance: a.demoBalance ?? undefined, initialDemoBalance: a.initialDemoBalance ?? undefined, run24_7: a.run24_7, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })) as never[]} />
      </div>
    </DashboardLayout>
  );
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentList } from '@/components/dashboard/AgentList';
import { Button } from '@/components/ui/Button';
import { safeDbConnect } from '@/lib/db/mongoose';
import Agent from '@/lib/db/models/Agent';
import User from '@/lib/db/models/User';
import { getFileAgentsByEmail } from '@/lib/db/file-agents';

export default async function AgentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  let agents: unknown[] = [];
  try {
    const db = await safeDbConnect();
    if (db) {
      const user = await User.findOne({ email: session.user.email });
      if (user) {
        agents = await Agent.find({ userId: user._id }).populate('walletId').sort({ createdAt: -1 }).lean();
      }
    }
    if (agents.length === 0) {
      agents = await getFileAgentsByEmail(session.user.email);
    }
  } catch {
    agents = await getFileAgentsByEmail(session.user.email).catch(() => []);
  }

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

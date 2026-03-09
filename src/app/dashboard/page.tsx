import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AgentList } from '@/components/dashboard/AgentList';
import { safeDbConnect } from '@/lib/db/mongoose';
import Agent from '@/lib/db/models/Agent';
import User from '@/lib/db/models/User';
import { getFileAgentsByEmail } from '@/lib/db/file-agents';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect('/');
  }

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

  const chartData = [{ date: new Date().toISOString().slice(0, 10), balance: 0 }];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Дашборд</h1>
          <QuickActions />
        </div>
        <section>
          <h2 className="mb-4 text-lg font-semibold">Баланс</h2>
          <BalanceChart data={chartData} />
        </section>
        <section>
          <h2 className="mb-4 text-lg font-semibold">Агенты</h2>
          <AgentList agents={agents as never[]} />
        </section>
      </div>
    </DashboardLayout>
  );
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { BalanceChart } from '@/components/dashboard/BalanceChart';
import { AgentList } from '@/components/dashboard/AgentList';
import { prisma } from '@/lib/db/prisma';
import { getOpenAiKeyByEmail } from '@/lib/db/user-openai';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const [user, hasOpenAiKey] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email },
      include: { agents: { orderBy: { createdAt: 'desc' } } },
    }),
    getOpenAiKeyByEmail(session.user.email).then((k) => Boolean(k)),
  ]);
  const agents = user?.agents ?? [];

  const chartData = [{ date: new Date().toISOString().slice(0, 10), balance: 0 }];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Дашборд</h1>
          <QuickActions hasOpenAiKey={hasOpenAiKey} />
        </div>
        <section>
          <h2 className="mb-4 text-lg font-semibold">Баланс</h2>
          <BalanceChart data={chartData} />
        </section>
        <section>
          <h2 className="mb-4 text-lg font-semibold">Агенты</h2>
          <AgentList agents={agents.map((a) => ({ _id: a.id, name: a.name, description: a.description ?? '', isActive: a.isActive, walletId: a.walletId ?? undefined, walletAddress: a.walletAddress ?? undefined, demoBalance: a.demoBalance ?? undefined, initialDemoBalance: a.initialDemoBalance ?? undefined, run24_7: a.run24_7, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })) as never[]} />
        </section>
      </div>
    </DashboardLayout>
  );
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentList } from '@/components/dashboard/AgentList';
import { Button } from '@/components/ui/Button';
import { prisma } from '@/lib/db/prisma';
import { getOpenAiKeyByEmail } from '@/lib/db/user-openai';

export default async function AgentsPage() {
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

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Агенты</h1>
        {hasOpenAiKey ? (
          <Button href="/dashboard/agents/create">Добавить агента</Button>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Чтобы создавать агентов, укажите OpenAI (ChatGPT) API key в Настройках.
            </p>
            <Button href="/dashboard/settings" variant="outline">
              Настройки
            </Button>
          </div>
        )}
      </div>
      <div className="mt-6">
        <AgentList agents={agents.map((a) => ({ _id: a.id, name: a.name, description: a.description ?? '', isActive: a.isActive, walletId: a.walletId ?? undefined, walletAddress: a.walletAddress ?? undefined, demoBalance: a.demoBalance ?? undefined, initialDemoBalance: a.initialDemoBalance ?? undefined, run24_7: a.run24_7, createdAt: a.createdAt.toISOString(), updatedAt: a.updatedAt.toISOString() })) as never[]} />
      </div>
    </DashboardLayout>
  );
}

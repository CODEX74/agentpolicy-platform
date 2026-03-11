import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentsPageContent } from '@/components/dashboard/AgentsPageContent';
import { prisma } from '@/lib/db/prisma';
import { getOpenAiKeyByEmail } from '@/lib/db/user-openai';

export default async function AgentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  let user:
    | (Awaited<ReturnType<typeof prisma.user.findUnique>> & {
        agents: { id: string; name: string; description: string | null; isActive: boolean; walletId: string | null; walletAddress: string | null; demoBalance: number | null; initialDemoBalance: number | null; run24_7: boolean; createdAt: Date; updatedAt: Date }[];
      })
    | null = null;
  let hasOpenAiKey = false;

  try {
    const [userRow, hasKey] = await Promise.all([
      prisma.user.findUnique({
        where: { email: session.user.email },
        include: { agents: { orderBy: { createdAt: 'desc' } } },
      }) as Promise<NonNullable<typeof user>>,
      getOpenAiKeyByEmail(session.user.email).then((k) => Boolean(k)),
    ]);
    user = userRow;
    hasOpenAiKey = hasKey;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('WITHIN GROUP is required for ordered-set aggregate mode')) {
      console.error('[AgentsPage] prisma error suppressed for dashboard/agents:', msg);
      user = null;
      hasOpenAiKey = false;
    } else {
      throw e;
    }
  }

  const agents = (user?.agents ?? []).map((a) => ({
    _id: a.id,
    name: a.name,
    description: a.description ?? '',
    isActive: a.isActive,
    walletId: a.walletId ?? undefined,
    walletAddress: a.walletAddress ?? undefined,
    demoBalance: a.demoBalance ?? undefined,
    initialDemoBalance: a.initialDemoBalance ?? undefined,
    run24_7: a.run24_7,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }));

  return (
    <DashboardLayout>
      <AgentsPageContent agents={agents} hasOpenAiKey={hasOpenAiKey} />
    </DashboardLayout>
  );
}

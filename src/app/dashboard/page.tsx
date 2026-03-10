import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardHomeContent } from '@/components/dashboard/DashboardHomeContent';
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
      <DashboardHomeContent agents={agents} hasOpenAiKey={hasOpenAiKey} />
    </DashboardLayout>
  );
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SettingsPageContent } from './SettingsPageContent';
import { prisma } from '@/lib/db/prisma';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const email = session.user.email;
  const user = await prisma.user.findUnique({ where: { email } });
  const name = user?.name || session.user.name || email.split('@')[0];
  const plan = user?.plan ?? 'free';
  const canChangePlan = true;
  const telegramId = (user?.telegramId as string | null | undefined) ?? null;

  return (
    <DashboardLayout>
      <SettingsPageContent
        email={email}
        initialName={name}
        initialPlan={plan}
        canChangePlan={canChangePlan}
        initialTelegramId={telegramId ?? ''}
      />
    </DashboardLayout>
  );
}

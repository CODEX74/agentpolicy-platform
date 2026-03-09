import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SettingsForm } from '@/components/dashboard/SettingsForm';
import { getFileUserByEmail } from '@/lib/db/file-users';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const email = session.user.email;
  const fileUser = await getFileUserByEmail(email);
  const name = fileUser?.name || session.user.name || email.split('@')[0];
  const plan = fileUser?.plan ?? 'free';
  const canChangePlan = true;
  const telegramId = (fileUser?.telegramId as string | null | undefined) ?? null;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Настройки</h1>
      <div className="mt-6">
        <SettingsForm
          email={email}
          initialName={name}
          initialPlan={plan}
          canChangePlan={canChangePlan}
          initialTelegramId={telegramId ?? ''}
        />
      </div>
    </DashboardLayout>
  );
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SettingsForm } from '@/components/dashboard/SettingsForm';
import { getFileUserByEmail } from '@/lib/db/file-users';
import { safeDbConnect } from '@/lib/db/mongoose';
import User from '@/lib/db/models/User';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const email = session.user.email;
  let name = session.user.name ?? email.split('@')[0];
  let plan = 'free';
  let canChangePlan = false;
  let telegramId: string | null = null;

  const fileUser = await getFileUserByEmail(email);
  if (fileUser) {
    name = fileUser.name || name;
    plan = fileUser.plan ?? 'free';
    canChangePlan = true;
    telegramId = (fileUser.telegramId as string | null | undefined) ?? null;
  } else {
    try {
      const db = await safeDbConnect();
      if (db) {
        const user = await User.findOne({ email }).lean();
        if (user?.name) name = user.name;
        telegramId = (user?.telegramId as string | null | undefined) ?? null;
      }
    } catch {
      // ignore
    }
  }

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

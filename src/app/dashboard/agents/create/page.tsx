import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateAgentForm } from './CreateAgentForm';
import { getOpenAiKeyByEmail } from '@/lib/db/user-openai';
import { Button } from '@/components/ui/Button';

export default async function CreateAgentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const hasOpenAiKey = Boolean(await getOpenAiKeyByEmail(session.user.email));

  if (!hasOpenAiKey) {
    return (
      <DashboardLayout>
        <div className="max-w-md">
          <h1 className="text-2xl font-bold">Добавить агента</h1>
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Чтобы создавать агентов, укажите OpenAI (ChatGPT) API key в Настройках.
            </p>
            <Button href="/dashboard/settings" variant="outline" className="mt-4">
              Перейти в Настройки
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">Добавить агента</h1>
        <CreateAgentForm />
      </div>
    </DashboardLayout>
  );
}

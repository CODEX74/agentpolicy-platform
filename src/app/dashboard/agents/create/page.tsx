import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CreateAgentPageContent } from './CreateAgentPageContent';
import { getOpenAiKeyByEmail } from '@/lib/db/user-openai';

export default async function CreateAgentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const hasOpenAiKey = Boolean(await getOpenAiKeyByEmail(session.user.email));

  return (
    <DashboardLayout>
      <CreateAgentPageContent hasOpenAiKey={hasOpenAiKey} />
    </DashboardLayout>
  );
}

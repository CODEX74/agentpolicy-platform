'use client';

import { QuickActions } from '@/components/dashboard/QuickActions';
import { AgentList } from '@/components/dashboard/AgentList';
import { DashboardBalanceSection } from '@/components/dashboard/DashboardBalanceSection';
import { useLang } from '@/contexts/LanguageContext';

const t = {
  ru: { title: 'Дашборд', balance: 'Баланс', agents: 'Агенты' },
  en: { title: 'Dashboard', balance: 'Balance', agents: 'Agents' },
};

export function DashboardHomeContent({
  agents,
  hasOpenAiKey,
}: {
  agents: { _id: string; name: string; description: string; isActive: boolean; walletId?: string; walletAddress?: string; demoBalance?: number; initialDemoBalance?: number; run24_7?: boolean; createdAt: string; updatedAt: string }[];
  hasOpenAiKey: boolean;
}) {
  const lang = useLang();
  const text = t[lang];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{text.title}</h1>
        <QuickActions hasOpenAiKey={hasOpenAiKey} />
      </div>
      <section>
        <h2 className="mb-4 text-lg font-semibold">{text.balance}</h2>
        <DashboardBalanceSection />
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">{text.agents}</h2>
        <AgentList agents={agents as never[]} />
      </section>
    </div>
  );
}

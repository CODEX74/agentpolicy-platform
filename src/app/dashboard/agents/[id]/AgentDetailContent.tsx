'use client';

import Link from 'next/link';
import { useLang, withLang } from '@/contexts/LanguageContext';
import { PolicyBuilder } from '@/components/dashboard/PolicyBuilder';
import { AgentWalletCard } from '@/components/dashboard/AgentWalletCard';
import { AgentDemoCard } from '@/components/dashboard/AgentDemoCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

const t = {
  ru: {
    demoBalance: 'Демо-баланс',
    positions: 'Позиции',
    backToAgents: '← К списку агентов',
    nextSteps: 'Что дальше?',
    nextIntro: 'Политика задаёт лимиты и правила для этого агента. Дальше можно:',
    dashboard: 'Дашборд',
    dashboardDesc: 'обзор агентов и быстрый доступ',
    transactions: 'Транзакции',
    transactionsDesc: 'история операций и проверка по политике',
    analytics: 'Аналитика',
    analyticsDesc: 'графики и отчёты по тратам',
    walletCdp: 'Создать кошелёк (CDP) и привязать к агенту — через API или настройки при интеграции с Coinbase CDP',
  },
  en: {
    demoBalance: 'Demo balance',
    positions: 'Positions',
    backToAgents: '← Back to agents',
    nextSteps: 'What next?',
    nextIntro: 'Policy sets limits and rules for this agent. Next you can:',
    dashboard: 'Dashboard',
    dashboardDesc: 'agent overview and quick access',
    transactions: 'Transactions',
    transactionsDesc: 'operation history and policy check',
    analytics: 'Analytics',
    analyticsDesc: 'charts and spending reports',
    walletCdp: 'Create a wallet (CDP) and link to agent — via API or settings when integrating with Coinbase CDP',
  },
};

type InitialPolicy = {
  dailyLimit: number;
  weeklyLimit: number;
  maxPerTransaction: number;
  allowedOperations: ('buy' | 'sell' | 'swap' | 'hold')[];
  timeRestrictionsEnabled?: boolean;
  startHour?: number;
  endHour?: number;
  minHoldingValue?: number;
  minHoldingUnit?: 'minutes' | 'hours' | 'days' | 'months' | 'years';
  notifyEmail?: boolean;
  notifyTelegram?: boolean;
  onEachTransaction?: boolean;
  onLimitExceeded?: boolean;
} | undefined;

type DemoPosition = { quantity: number; asset: string; avgPriceUsd: number };

export function AgentDetailContent({
  agentId,
  agent,
  initialPolicy,
  demoPositions,
}: {
  agentId: string;
  agent: { name: string; walletId: string | null; walletAddress: string | null; demoBalance: number | null };
  initialPolicy: InitialPolicy;
  demoPositions: DemoPosition[];
}) {
  const lang = useLang();
  const text = t[lang];

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          {agent.demoBalance != null && agent.demoBalance >= 0 && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
              {text.demoBalance}: {agent.demoBalance} USDT
            </span>
          )}
          {demoPositions.length > 0 && (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {text.positions}: {demoPositions.map((p) => `${p.quantity < 0.01 ? p.quantity.toExponential(2) : p.quantity.toFixed(4)} ${p.asset} @ $${p.avgPriceUsd.toFixed(0)}`).join(', ')}
            </span>
          )}
        </div>
        <Link
          href={withLang('/dashboard/agents', lang)}
          className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
        >
          {text.backToAgents}
        </Link>
      </div>
      <AgentWalletCard
        agentId={agentId}
        currentWalletId={agent.walletId ?? null}
        currentWalletAddress={agent.walletAddress ?? null}
      />
      <AgentDemoCard agentId={agentId} />
      <PolicyBuilder agentId={agentId} initialPolicy={initialPolicy} />
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">{text.nextSteps}</h3>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>{text.nextIntro}</p>
          <ul className="list-inside list-disc space-y-1">
            <li>
              <Link href={withLang('/dashboard', lang)} className="underline hover:no-underline">{text.dashboard}</Link>
              {' — '}{text.dashboardDesc}
            </li>
            <li>
              <Link href={withLang('/dashboard/transactions', lang)} className="underline hover:no-underline">{text.transactions}</Link>
              {' — '}{text.transactionsDesc}
            </li>
            <li>
              <Link href={withLang('/dashboard/analytics', lang)} className="underline hover:no-underline">{text.analytics}</Link>
              {' — '}{text.analyticsDesc}
            </li>
            <li>{text.walletCdp}</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

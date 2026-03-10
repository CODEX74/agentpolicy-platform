import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PolicyBuilder } from '@/components/dashboard/PolicyBuilder';
import { AgentWalletCard } from '@/components/dashboard/AgentWalletCard';
import { AgentDemoCard } from '@/components/dashboard/AgentDemoCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { prisma } from '@/lib/db/prisma';
import { getDemoPositions } from '@/lib/db/demo-transactions';

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const ALLOWED_OPS = ['buy', 'sell', 'swap', 'hold'] as const;
  const mapOp = (op: string): (typeof ALLOWED_OPS)[number] | null => {
    const m: Record<string, (typeof ALLOWED_OPS)[number]> = { transfer: 'buy', swap: 'swap', nft: 'sell', contract: 'swap', buy: 'buy', sell: 'sell', hold: 'hold' };
    const v = m[op];
    return v && ALLOWED_OPS.includes(v) ? v : null;
  };

  const paramsRes = await params;
  const id = paramsRes.id;

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) redirect('/');
  const agentRow = await prisma.agent.findFirst({
    where: { id, userId: user.id },
  });
  if (!agentRow) notFound();

  const agent = {
    name: agentRow.name,
    walletId: agentRow.walletId,
    walletAddress: agentRow.walletAddress,
    demoBalance: agentRow.demoBalance,
  };

  const policyRow = await prisma.policy.findUnique({
    where: { userId_agentId: { userId: user.id, agentId: id } },
  });
  const fp = policyRow;
  let initialPolicy:
    | {
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
      }
    | undefined;
  if (fp) {
    const ops = (fp.allowedOperations || [])
      .map(mapOp)
      .filter(
        (o: (typeof ALLOWED_OPS)[number] | null): o is (typeof ALLOWED_OPS)[number] =>
          o != null
      );
    const tr = (fp.timeRestrictions as
      | {
          enabled?: boolean;
          startHour?: number;
          endHour?: number;
          minHolding?: { value?: number; unit?: string };
        }
      | null) ?? {};
    const notif = (fp.notifications as
      | {
          email?: boolean;
          telegram?: boolean;
          onEachTransaction?: boolean;
          onLimitExceeded?: boolean;
        }
      | null) ?? {};
    const minHolding = tr.minHolding ?? {};
    initialPolicy = {
      dailyLimit: fp.dailyLimit,
      weeklyLimit: fp.weeklyLimit,
      maxPerTransaction: fp.maxPerTransaction,
      allowedOperations: ops.length ? ops : ['buy', 'hold'],
      timeRestrictionsEnabled: Boolean(tr.enabled),
      startHour: typeof tr.startHour === 'number' ? tr.startHour : 0,
      endHour: typeof tr.endHour === 'number' ? tr.endHour : 23,
      minHoldingValue:
        typeof minHolding.value === 'number' && !Number.isNaN(minHolding.value)
          ? minHolding.value
          : 60,
      minHoldingUnit:
        minHolding.unit === 'hours' ||
        minHolding.unit === 'days' ||
        minHolding.unit === 'months' ||
        minHolding.unit === 'years'
          ? minHolding.unit
          : 'minutes',
      notifyEmail: notif.email ?? true,
      notifyTelegram: notif.telegram ?? false,
      onEachTransaction: notif.onEachTransaction ?? true,
      onLimitExceeded: notif.onLimitExceeded ?? true,
    };
  }

  const demoPositions = await getDemoPositions(id!, session.user.email);

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            {agent.demoBalance != null && agent.demoBalance >= 0 && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                Демо-баланс: {agent.demoBalance} USDT
              </span>
            )}
            {demoPositions.length > 0 && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                Позиции: {demoPositions.map((p) => `${p.quantity < 0.01 ? p.quantity.toExponential(2) : p.quantity.toFixed(4)} ${p.asset} @ $${p.avgPriceUsd.toFixed(0)}`).join(', ')}
              </span>
            )}
          </div>
          <Link
            href="/dashboard/agents"
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← К списку агентов
          </Link>
        </div>
        <AgentWalletCard
          agentId={id!}
          currentWalletId={agent.walletId ?? null}
          currentWalletAddress={agent.walletAddress ?? null}
        />
        <AgentDemoCard agentId={id!} />
        <PolicyBuilder agentId={id!} initialPolicy={initialPolicy} />
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium">Что дальше?</h3>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            <p>Политика задаёт лимиты и правила для этого агента. Дальше можно:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>
                <Link href="/dashboard" className="underline hover:no-underline">
                  Дашборд
                </Link>
                — обзор агентов и быстрый доступ
              </li>
              <li>
                <Link href="/dashboard/transactions" className="underline hover:no-underline">
                  Транзакции
                </Link>
                — история операций и проверка по политике
              </li>
              <li>
                <Link href="/dashboard/analytics" className="underline hover:no-underline">
                  Аналитика
                </Link>
                — графики и отчёты по тратам
              </li>
              <li>
                Создать кошелёк (CDP) и привязать к агенту — через API или настройки при интеграции с Coinbase CDP
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

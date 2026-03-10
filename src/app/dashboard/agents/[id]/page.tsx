import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AgentDetailContent } from './AgentDetailContent';
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
      <AgentDetailContent
        agentId={id!}
        agent={{
          name: agent.name,
          walletId: agent.walletId ?? null,
          walletAddress: agent.walletAddress ?? null,
          demoBalance: agent.demoBalance,
        }}
        initialPolicy={initialPolicy}
        demoPositions={demoPositions}
      />
    </DashboardLayout>
  );
}

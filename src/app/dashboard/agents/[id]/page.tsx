import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PolicyBuilder } from '@/components/dashboard/PolicyBuilder';
import { AgentWalletCard } from '@/components/dashboard/AgentWalletCard';
import { AgentDemoCard } from '@/components/dashboard/AgentDemoCard';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { safeDbConnect } from '@/lib/db/mongoose';
import Agent from '@/lib/db/models/Agent';
import Policy from '@/lib/db/models/Policy';
import User from '@/lib/db/models/User';
import { getFileAgentById } from '@/lib/db/file-agents';
import { getFilePoliciesByEmail } from '@/lib/db/file-policies';
import { getDemoPositions } from '@/lib/db/file-demo-transactions';

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  const ALLOWED_OPS = ['buy', 'sell', 'swap', 'hold'] as const;
  const mapOp = (op: string): (typeof ALLOWED_OPS)[number] | null => {
    const m: Record<string, (typeof ALLOWED_OPS)[number]> = { transfer: 'buy', swap: 'swap', nft: 'sell', contract: 'swap', buy: 'buy', sell: 'sell', hold: 'hold' };
    const v = m[op];
    return v && ALLOWED_OPS.includes(v) ? v : null;
  };

  let agent: {
    name: string;
    walletId?: string | null;
    walletAddress?: string | null;
    walletIdObj?: { _id: string; address?: string } | null;
    demoBalance?: number;
  } | null = null;
  let initialPolicy: { dailyLimit: number; weeklyLimit: number; maxPerTransaction: number; allowedOperations: ('buy' | 'sell' | 'swap' | 'hold')[] } | undefined;
  let id: string;

  const paramsRes = await params;
  id = paramsRes.id;

  try {
    const db = await safeDbConnect();
    if (db) {
      const user = await User.findOne({ email: session.user.email });
      if (user) {
        const agentDoc = await Agent.findOne({ _id: id, userId: user._id }).populate('walletId').lean();
        if (agentDoc) {
          const walletId = agentDoc.walletId as { _id: string; address?: string } | null | undefined;
          agent = {
            name: agentDoc.name,
            walletId: walletId?._id ?? agentDoc.walletId,
            walletAddress: walletId?.address,
            walletIdObj: walletId,
          };
          const policy = await Policy.findOne({ agentId: id }).lean();
          initialPolicy = policy
            ? (() => {
                const ops = (policy.allowedOperations || []).map(mapOp).filter((o): o is (typeof ALLOWED_OPS)[number] => o != null);
                return {
                  dailyLimit: policy.dailyLimit,
                  weeklyLimit: policy.weeklyLimit,
                  maxPerTransaction: policy.maxPerTransaction,
                  allowedOperations: ops.length ? ops : ['buy', 'hold'],
                };
              })()
            : undefined;
        }
      }
    }
  } catch {
    // ignore
  }

  if (!agent) {
    const fileAgent = await getFileAgentById(id, session.user.email);
    if (fileAgent) {
      agent = {
        name: fileAgent.name,
        walletId: fileAgent.walletId,
        walletAddress: fileAgent.walletAddress,
        demoBalance: fileAgent.demoBalance,
      };
      const filePolicies = await getFilePoliciesByEmail(session.user.email, id);
      const fp = filePolicies[0];
      if (fp && !initialPolicy) {
        const ops = (fp.allowedOperations || []).map(mapOp).filter((o): o is (typeof ALLOWED_OPS)[number] => o != null);
        initialPolicy = {
          dailyLimit: fp.dailyLimit,
          weeklyLimit: fp.weeklyLimit,
          maxPerTransaction: fp.maxPerTransaction,
          allowedOperations: ops.length ? ops : ['buy', 'hold'],
        };
      }
    }
  }

  if (!agent) notFound();

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

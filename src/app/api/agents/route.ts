import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { getOpenAiKeyByEmail } from '@/lib/db/user-openai';
import { PRICING_PLANS } from '@/lib/constants/pricing';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  moltbookId: z.string().optional(),
  agentType: z.enum(['INVESTOR', 'TRADER']).optional(),
  mode: z.enum(['DEMO', 'WALLET']).optional(),
});

function toAgentResponse(a: {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  agentType: 'INVESTOR' | 'TRADER';
  agentMode: 'DEMO' | 'WALLET';
  isActive: boolean;
  walletId: string | null;
  walletAddress: string | null;
  demoBalance: number | null;
  initialDemoBalance: number | null;
  realWalletAddress: string | null;
  realWalletNetwork: string | null;
  realWalletAsset: string | null;
  realTradingEnabled: boolean;
  realMaxPositionUsd: number | null;
  realDailyLimitUsd: number | null;
  run24_7: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    _id: a.id,
    userEmail: '', // not needed for list
    name: a.name,
    description: a.description ?? '',
    agentType: a.agentType,
    mode: a.agentMode,
    isActive: a.isActive,
    walletId: a.walletId ?? undefined,
    walletAddress: a.walletAddress ?? undefined,
    demoBalance: a.demoBalance ?? undefined,
    initialDemoBalance: a.initialDemoBalance ?? undefined,
    realWalletAddress: a.realWalletAddress ?? undefined,
    realWalletNetwork: a.realWalletNetwork ?? undefined,
    realWalletAsset: a.realWalletAsset ?? undefined,
    realTradingEnabled: a.realTradingEnabled,
    realMaxPositionUsd: a.realMaxPositionUsd ?? undefined,
    realDailyLimitUsd: a.realDailyLimitUsd ?? undefined,
    run24_7: a.run24_7,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });
    if (!user) return NextResponse.json([]);

    const agents = await prisma.agent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(agents.map(toAgentResponse));
  } catch (err) {
    console.error('GET /api/agents', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getAgentsLimit(planId: string | undefined): number {
  const plan = PRICING_PLANS.find((p) => p.id === (planId || 'free'));
  return plan?.agentsLimit ?? PRICING_PLANS[0].agentsLimit;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const openaiKey = await getOpenAiKeyByEmail(email);
    const hasEnvKey = Boolean(process.env.GROQ_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim());
    if (!openaiKey && !hasEnvKey) {
      return NextResponse.json(
        { error: 'Укажите OpenAI (ChatGPT) API key в Настройках или задайте GROQ_API_KEY/OPENAI_API_KEY в окружении, чтобы создавать агентов.' },
        { status: 403 }
      );
    }

    const planId = (session.user as { plan?: string }).plan;
    const limit = getAgentsLimit(planId);
    const body = await req.json();
    const data = createAgentSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
    });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const agentsCount = await prisma.agent.count({
      where: { userId: user.id },
    });

    if (limit !== -1 && agentsCount >= limit) {
      return NextResponse.json(
        { error: 'Достигнут лимит агентов по вашему тарифу' },
        { status: 403 }
      );
    }

    const agent = await prisma.agent.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description ?? '',
        agentType: data.agentType ?? 'INVESTOR',
        agentMode: (data.mode ?? 'DEMO') as 'DEMO' | 'WALLET',
      },
    });

    let finalAgent = agent;
    if (data.mode === 'WALLET') {
      try {
        const { createRealAgentWallet } = await import('@/lib/agents/realWallet');
        finalAgent = await createRealAgentWallet(user.id, agent.id);
      } catch (walletErr) {
        console.error('createRealAgentWallet failed (agent created without real wallet)', walletErr);
        // Агент уже создан; кошелёк можно создать позже через API или настройки
      }
    }

    return NextResponse.json(toAgentResponse(finalAgent as unknown as Parameters<typeof toAgentResponse>[0]));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('POST /api/agents', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const safeMessage =
      message.includes('agent_mode') || message.includes('WITHIN GROUP')
        ? 'Ошибка базы данных. Выполните на сервере: npx prisma migrate deploy'
        : message.slice(0, 200);
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

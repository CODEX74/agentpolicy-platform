import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const updateAgentSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isActive: z.boolean().optional(),
  agentType: z.enum(['INVESTOR', 'TRADER']).optional(),
  mode: z.enum(['DEMO', 'WALLET']).optional(),
  realTradingEnabled: z.boolean().optional(),
  realMaxPositionUsd: z.number().nullable().optional(),
  realMinPositionUsd: z.number().nullable().optional(),
  realDailyLimitUsd: z.number().nullable().optional(),
  realNotes: z.string().max(2000).nullable().optional(),
  realTradeRecipient: z.string().max(100).nullable().optional(),
});

function toAgentResponse(a: {
  id: string;
  name: string;
  description: string | null;
  agentType: 'INVESTOR' | 'TRADER';
  agentMode: 'DEMO' | 'WALLET';
  isActive: boolean;
  walletId: string | null;
  walletAddress: string | null;
  demoBalance: number | null;
  realWalletAddress: string | null;
  realWalletNetwork: string | null;
  realWalletAsset: string | null;
  realTradingEnabled: boolean;
  realMaxPositionUsd: number | null;
  realMinPositionUsd: number | null;
  realDailyLimitUsd: number | null;
  realNotes: string | null;
  realTradeRecipient: string | null;
  run24_7: boolean;
}) {
  return {
    _id: a.id,
    name: a.name,
    description: a.description ?? '',
    agentType: a.agentType,
    mode: a.agentMode,
    isActive: a.isActive,
    walletId: a.walletId ?? undefined,
    walletAddress: a.walletAddress ?? undefined,
    demoBalance: a.demoBalance ?? undefined,
    realWalletAddress: a.realWalletAddress ?? undefined,
    realWalletNetwork: a.realWalletNetwork ?? undefined,
    realWalletAsset: a.realWalletAsset ?? undefined,
    realTradingEnabled: a.realTradingEnabled,
    realMaxPositionUsd: a.realMaxPositionUsd ?? undefined,
    realMinPositionUsd: a.realMinPositionUsd ?? undefined,
    realDailyLimitUsd: a.realDailyLimitUsd ?? undefined,
    realNotes: a.realNotes ?? undefined,
    realTradeRecipient: a.realTradeRecipient ?? undefined,
    run24_7: a.run24_7,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const agent = await prisma.agent.findFirst({
      where: { id, userId: user.id },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    return NextResponse.json(toAgentResponse(agent));
  } catch (err) {
    console.error('GET /api/agents/[id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await req.json();
    const data = updateAgentSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const agent = await prisma.agent.findFirst({
      where: { id, userId: user.id },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const updated = await prisma.agent.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name }),
        ...(data.description != null && { description: data.description }),
        ...(data.isActive != null && { isActive: data.isActive }),
        ...(data.agentType != null && { agentType: data.agentType }),
        ...(data.mode != null && { agentMode: data.mode }),
        ...(data.realTradingEnabled != null && { realTradingEnabled: data.realTradingEnabled }),
        ...(data.realMaxPositionUsd !== undefined && { realMaxPositionUsd: data.realMaxPositionUsd }),
        ...(data.realMinPositionUsd !== undefined && { realMinPositionUsd: data.realMinPositionUsd }),
        ...(data.realDailyLimitUsd !== undefined && { realDailyLimitUsd: data.realDailyLimitUsd }),
        ...(data.realNotes !== undefined && { realNotes: data.realNotes }),
        ...(data.realTradeRecipient !== undefined && { realTradeRecipient: data.realTradeRecipient }),
      },
    });
    return NextResponse.json(toAgentResponse(updated));
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('PATCH /api/agents/[id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const agent = await prisma.agent.findFirst({
      where: { id, userId: user.id },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    await prisma.agent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/agents/[id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

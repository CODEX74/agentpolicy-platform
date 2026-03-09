import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { safeDbConnect } from '@/lib/db/mongoose';
import Agent from '@/lib/db/models/Agent';
import User from '@/lib/db/models/User';
import { getFileAgentsByEmail, createFileAgent } from '@/lib/db/file-agents';
import { PRICING_PLANS } from '@/lib/constants/pricing';
import { z } from 'zod';

const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  moltbookId: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;

    const db = await safeDbConnect();
    if (db) {
      try {
        const user = await User.findOne({ email });
        if (user) {
          const agents = await Agent.find({ userId: user._id }).populate('walletId').sort({ createdAt: -1 });
          return NextResponse.json(agents);
        }
      } catch {
        // fallback to file
      }
    }

    const fileAgents = await getFileAgentsByEmail(email);
    return NextResponse.json(fileAgents);
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
    const planId = (session.user as { plan?: string }).plan;
    const limit = getAgentsLimit(planId);
    const body = await req.json();
    const data = createAgentSchema.parse(body);

    const db = await safeDbConnect();
    if (db) {
      try {
        const user = await User.findOne({ email });
        if (user) {
          if (limit !== -1) {
            const count = await Agent.countDocuments({ userId: user._id });
            if (count >= limit) {
              return NextResponse.json(
                { error: 'Достигнут лимит агентов по вашему тарифу' },
                { status: 403 }
              );
            }
          }
          const agent = await Agent.create({
            userId: user._id,
            name: data.name,
            description: data.description,
            moltbookId: data.moltbookId,
          });
          return NextResponse.json(agent);
        }
      } catch {
        // fallback to file
      }
    }

    if (limit !== -1) {
      const fileAgents = await getFileAgentsByEmail(email);
      if (fileAgents.length >= limit) {
        return NextResponse.json(
          { error: 'Достигнут лимит агентов по вашему тарифу' },
          { status: 403 }
        );
      }
    }

    const fileAgent = await createFileAgent({
      userEmail: email,
      name: data.name,
      description: data.description,
    });
    return NextResponse.json(fileAgent);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('POST /api/agents', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

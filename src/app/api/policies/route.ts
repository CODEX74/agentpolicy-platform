import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const policySchema = z.object({
  agentId: z.string(),
  name: z.string().optional(),
  dailyLimit: z.number().min(0).optional(),
  weeklyLimit: z.number().min(0).optional(),
  maxPerTransaction: z.number().min(0).optional(),
  allowedAddresses: z.array(z.string()).optional(),
  blockedAddresses: z.array(z.string()).optional(),
  allowedOperations: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      telegram: z.boolean().optional(),
      onEachTransaction: z.boolean().optional(),
      onLimitExceeded: z.boolean().optional(),
    })
    .optional(),
  timeRestrictions: z
    .object({
      enabled: z.boolean().optional(),
      startHour: z.number().optional(),
      endHour: z.number().optional(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const agentId = req.nextUrl.searchParams.get('agentId') ?? undefined;

    const rows = await prisma.policy.findMany({
      where: {
        userId: user.id,
        ...(agentId && { agentId }),
      },
      orderBy: { updatedAt: 'desc' },
    });
    const policies = rows.map((p) => ({
      _id: p.id,
      userEmail: email,
      agentId: p.agentId,
      name: p.name,
      dailyLimit: p.dailyLimit,
      weeklyLimit: p.weeklyLimit,
      maxPerTransaction: p.maxPerTransaction,
      allowedOperations: p.allowedOperations,
      timeRestrictions: p.timeRestrictions as { enabled?: boolean; startHour?: number; endHour?: number } | null,
      notifications: p.notifications as { email?: boolean; telegram?: boolean; onEachTransaction?: boolean; onLimitExceeded?: boolean } | null,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
    return NextResponse.json(policies);
  } catch (err) {
    console.error('GET /api/policies', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const body = await req.json();
    const data = policySchema.parse(body);

    const agent = await prisma.agent.findFirst({
      where: { id: data.agentId, userId: user.id },
    });
    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const policy = await prisma.policy.upsert({
      where: { userId_agentId: { userId: user.id, agentId: data.agentId } },
      create: {
        userId: user.id,
        agentId: data.agentId,
        name: data.name ?? 'Default Policy',
        dailyLimit: data.dailyLimit ?? 0,
        weeklyLimit: data.weeklyLimit ?? 0,
        maxPerTransaction: data.maxPerTransaction ?? 0,
        allowedOperations: data.allowedOperations ?? ['transfer'],
        timeRestrictions: data.timeRestrictions,
        notifications: data.notifications,
        isActive: data.isActive ?? true,
      },
      update: {
        ...(data.name != null && { name: data.name }),
        ...(data.dailyLimit != null && { dailyLimit: data.dailyLimit }),
        ...(data.weeklyLimit != null && { weeklyLimit: data.weeklyLimit }),
        ...(data.maxPerTransaction != null && { maxPerTransaction: data.maxPerTransaction }),
        ...(data.allowedOperations != null && { allowedOperations: data.allowedOperations }),
        ...(data.timeRestrictions != null && { timeRestrictions: data.timeRestrictions }),
        ...(data.notifications != null && { notifications: data.notifications }),
        ...(data.isActive != null && { isActive: data.isActive }),
      },
    });
    return NextResponse.json({
      _id: policy.id,
      userEmail: email,
      agentId: policy.agentId,
      name: policy.name,
      dailyLimit: policy.dailyLimit,
      weeklyLimit: policy.weeklyLimit,
      maxPerTransaction: policy.maxPerTransaction,
      allowedOperations: policy.allowedOperations,
      timeRestrictions: policy.timeRestrictions,
      notifications: policy.notifications,
      isActive: policy.isActive,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('POST /api/policies', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

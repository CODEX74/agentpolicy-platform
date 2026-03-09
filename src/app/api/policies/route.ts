import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { safeDbConnect } from '@/lib/db/mongoose';
import Policy from '@/lib/db/models/Policy';
import User from '@/lib/db/models/User';
import { getFilePoliciesByEmail, upsertFilePolicy } from '@/lib/db/file-policies';
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
    const agentId = req.nextUrl.searchParams.get('agentId') ?? undefined;

    const db = await safeDbConnect();
    if (db) {
      try {
        const user = await User.findOne({ email });
        if (user) {
          const filter: { userId: unknown; agentId?: unknown } = { userId: user._id };
          if (agentId) filter.agentId = agentId;
          const policies = await Policy.find(filter).populate('agentId').sort({ updatedAt: -1 });
          return NextResponse.json(policies);
        }
      } catch {
        // fallback to file
      }
    }

    const filePolicies = await getFilePoliciesByEmail(email, agentId ?? undefined);
    return NextResponse.json(filePolicies);
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
    const body = await req.json();
    const data = policySchema.parse(body);

    const db = await safeDbConnect();
    if (db) {
      try {
        const user = await User.findOne({ email });
        if (user) {
          const payload: Record<string, unknown> = {
            ...data,
            userId: user._id,
          };
          if (data.notifications) {
            payload.notifications = data.notifications;
          }
          if (data.timeRestrictions) {
            payload.timeRestrictions = data.timeRestrictions;
          }
          const policy = await Policy.findOneAndUpdate(
            { agentId: data.agentId, userId: user._id },
            { $set: payload },
            { new: true, upsert: true }
          );
          return NextResponse.json(policy);
        }
      } catch {
        // fallback to file
      }
    }

    const filePolicy = await upsertFilePolicy({
      userEmail: email,
      agentId: data.agentId,
      name: data.name,
      dailyLimit: data.dailyLimit,
      weeklyLimit: data.weeklyLimit,
      maxPerTransaction: data.maxPerTransaction,
      allowedOperations: data.allowedOperations,
      isActive: data.isActive,
      notifications: data.notifications,
      timeRestrictions: data.timeRestrictions,
    });
    return NextResponse.json(filePolicy);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('POST /api/policies', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

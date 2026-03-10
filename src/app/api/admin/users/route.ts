import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';

const ADMIN_COOKIE_NAME = 'admin_session';

async function ensureAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  return Boolean(session?.value);
}

export async function GET() {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      agents: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      createdAt: u.createdAt.toISOString(),
      password: u.password,
      openaiApiKey: u.openaiApiKey,
      agents: u.agents.map((a) => ({
        id: a.id,
        name: a.name,
        agentType: a.agentType,
        demoBalance: a.demoBalance,
        createdAt: a.createdAt.toISOString(),
      })),
    })),
  });
}


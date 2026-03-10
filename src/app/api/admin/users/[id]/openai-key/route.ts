import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';

const ADMIN_COOKIE_NAME = 'admin_session';

async function ensureAdmin() {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);
  return Boolean(session?.value);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  const { openaiApiKey } = (await req.json().catch(() => ({}))) as {
    openaiApiKey?: string | null;
  };

  try {
    await prisma.user.update({
      where: { id },
      data: {
        openaiApiKey: openaiApiKey ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/admin/users/[id]/openai-key', e);
    return NextResponse.json({ error: 'Failed to update API key' }, { status: 500 });
  }
}


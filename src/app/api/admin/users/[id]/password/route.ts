import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';

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

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || password.length < 4) {
    return NextResponse.json(
      { error: 'Минимальная длина пароля — 4 символа' },
      { status: 400 }
    );
  }

  try {
    const hashed = hashPassword(password);
    await prisma.user.update({
      where: { id },
      data: { password: hashed },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/admin/users/[id]/password', e);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}


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

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await ensureAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  try {
    await prisma.user.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/admin/users/[id]', e);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}


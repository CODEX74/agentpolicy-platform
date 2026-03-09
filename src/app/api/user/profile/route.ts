import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getFileUserByEmail, updateFileUserName } from '@/lib/db/file-users';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().min(1).max(200),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const body = await req.json();
    const { name } = bodySchema.parse(body);

    const fileUser = await getFileUserByEmail(email);
    if (!fileUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const updated = await updateFileUserName(email, name);
    return NextResponse.json(updated ?? fileUser);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.flatten() }, { status: 400 });
    }
    console.error('PATCH /api/user/profile', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

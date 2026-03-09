import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getFileUserByEmail, updateFileUserPlan } from '@/lib/db/file-users';
import { z } from 'zod';

const bodySchema = z.object({
  plan: z.enum(['free', 'pro', 'enterprise']),
});

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const email = session.user.email;
    const body = await req.json();
    const { plan } = bodySchema.parse(body);

    const fileUser = await getFileUserByEmail(email);
    if (!fileUser) {
      return NextResponse.json(
        { error: 'Смена тарифа доступна только для аккаунтов с локальным входом' },
        { status: 400 }
      );
    }

    const updated = await updateFileUserPlan(email, plan);
    return NextResponse.json(updated ?? fileUser);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Недопустимый тариф' }, { status: 400 });
    }
    console.error('PATCH /api/user/plan', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

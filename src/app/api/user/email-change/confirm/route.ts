import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const schema = z.object({
  newEmail: z.string().email(),
  code: z.string().min(6).max(6),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { newEmail, code } = schema.parse(body);

    const currentEmail = session.user.email.toLowerCase();
    const targetEmail = newEmail.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: currentEmail } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existingWithTarget = await prisma.user.findUnique({
      where: { email: targetEmail },
    });
    if (existingWithTarget) {
      return NextResponse.json(
        { error: 'Этот email уже используется другим пользователем' },
        { status: 400 }
      );
    }

    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: `change:${user.id}:${targetEmail}`,
        token: code.trim(),
        expires: { gt: new Date() },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Неверный или просроченный код подтверждения' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: targetEmail,
        emailVerified: new Date(),
      },
    });

    await prisma.verificationToken.deleteMany({
      where: { identifier: `change:${user.id}:${targetEmail}`, token: code.trim() },
    });

    return NextResponse.json({
      ok: true,
      message: 'Email изменён. Войдите заново, используя новый адрес.',
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error('POST /api/user/email-change/confirm', e);
    return NextResponse.json(
      { error: 'Не удалось подтвердить смену email. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}


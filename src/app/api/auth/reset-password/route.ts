import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
  password: z.string().min(6, 'Пароль не менее 6 символов'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const email = data.email.toLowerCase();
    const code = data.code.trim();
    const newPassword = data.password;

    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: `reset:${email}`,
        token: code,
        expires: { gt: new Date() },
      },
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Неверный или просроченный код подтверждения' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const hashed = hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await prisma.verificationToken.deleteMany({
      where: { identifier: `reset:${email}`, token: code },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error('Reset password error:', e);
    return NextResponse.json(
      { error: 'Не удалось сбросить пароль. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}


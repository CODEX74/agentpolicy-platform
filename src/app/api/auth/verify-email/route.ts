import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const email = data.email.toLowerCase();
    const code = data.code.trim();

    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
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

    await prisma.user.updateMany({
      where: { email },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.deleteMany({
      where: { identifier: email, token: code },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error('Verify email error:', e);
    return NextResponse.json(
      { error: 'Не удалось подтвердить email. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}


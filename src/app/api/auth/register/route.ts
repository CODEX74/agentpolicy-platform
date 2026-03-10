import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Пароль не менее 6 символов'),
  name: z.string().min(1).max(200).optional(),
});

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const hashed = hashPassword(data.password);
    const email = data.email.toLowerCase();
    const name = data.name ?? data.email.split('@')[0];

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже зарегистрирован' },
        { status: 400 }
      );
    }

    await prisma.user.create({
      data: { email, name, password: hashed },
    });

    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    // Используем стандартную таблицу VerificationToken
    await prisma.verificationToken.upsert({
      where: { token: code },
      update: {
        identifier: email,
        expires,
      },
      create: {
        identifier: email,
        token: code,
        expires,
      },
    });

    let emailSent = true;
    try {
      await sendEmail({
        to: email,
        subject: 'Подтверждение регистрации в AgentPolicy',
        text: `Ваш код подтверждения: ${code}\n\nКод действует 15 минут. Введите его на странице подтверждения email.`,
      });
    } catch (e) {
      emailSent = false;
      console.error('Failed to send verification email', e);
      // Не блокируем регистрацию, просто отмечаем, что письмо не ушло
    }

    return NextResponse.json({
      ok: true,
      requiresVerification: emailSent,
      emailSent,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error('Register error:', e);
    return NextResponse.json(
      { error: 'Ошибка регистрации. Проверьте подключение к базе.' },
      { status: 500 }
    );
  }
}

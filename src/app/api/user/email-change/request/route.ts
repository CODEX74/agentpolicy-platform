import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const schema = z.object({
  newEmail: z.string().email(),
});

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { newEmail } = schema.parse(body);
    const email = session.user.email.toLowerCase();
    const targetEmail = newEmail.toLowerCase();

    if (email === targetEmail) {
      return NextResponse.json(
        { error: 'Новый email совпадает с текущим' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
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

    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationToken.upsert({
      where: { token: code },
      update: {
        identifier: `change:${user.id}:${targetEmail}`,
        expires,
      },
      create: {
        identifier: `change:${user.id}:${targetEmail}`,
        token: code,
        expires,
      },
    });

    try {
      await sendEmail({
        to: targetEmail,
        subject: 'Подтверждение смены email в AgentWallet',
        text: `Вы запросили смену email для своего аккаунта AgentWallet.\n\nНовый email: ${targetEmail}\nКод подтверждения: ${code}\n\nКод действует 15 минут. Если вы не инициировали смену email — просто проигнорируйте это письмо.`,
      });
    } catch (e) {
      console.error('Failed to send email change confirmation', e);
      return NextResponse.json(
        {
          error:
            'Не удалось отправить письмо с кодом подтверждения. Проверьте настройки почты на сервере.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error('POST /api/user/email-change/request', e);
    return NextResponse.json(
      { error: 'Не удалось запросить смену email. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}


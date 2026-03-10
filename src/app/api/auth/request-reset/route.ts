import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
});

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);
    const email = data.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Чтобы нельзя было перебором узнать наличие аккаунта, всегда отвечаем ok
      return NextResponse.json({ ok: true });
    }

    const code = generateCode();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.verificationToken.upsert({
      where: { token: code },
      update: {
        identifier: `reset:${email}`,
        expires,
      },
      create: {
        identifier: `reset:${email}`,
        token: code,
        expires,
      },
    });

    try {
      await sendEmail({
        to: email,
        subject: 'Сброс пароля AgentPolicy',
        text: `Ваш код для сброса пароля: ${code}\n\nКод действует 15 минут. Введите его на странице сброса пароля.`,
      });
    } catch (e) {
      console.error('Failed to send reset email', e);
      return NextResponse.json(
        {
          error:
            'Не удалось отправить письмо с кодом сброса. Проверьте настройки почты на сервере.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    console.error('Request reset error:', e);
    return NextResponse.json(
      { error: 'Не удалось запросить сброс пароля. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}


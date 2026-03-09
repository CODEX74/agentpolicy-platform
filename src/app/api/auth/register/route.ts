import { NextRequest, NextResponse } from 'next/server';
import { createFileUser } from '@/lib/db/file-users';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Пароль не менее 6 символов'),
  name: z.string().min(1).max(200).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const hashed = hashPassword(data.password);
    const email = data.email.toLowerCase();
    const name = data.name ?? data.email.split('@')[0];

    await createFileUser({ email, name, password: hashed });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.flatten() }, { status: 400 });
    }
    if (e instanceof Error && e.message.includes('уже зарегистрирован')) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error('Register error:', e);
    return NextResponse.json(
      { error: 'Ошибка регистрации. Проверьте подключение к базе.' },
      { status: 500 }
    );
  }
}

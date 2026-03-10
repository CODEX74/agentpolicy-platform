import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_LOGIN = 'adm#&$($!*72dg633hx';
const ADMIN_PASSWORD = 'hdh8364(_#-?eub@##';
const ADMIN_COOKIE_NAME = 'admin_session';

export async function POST(req: NextRequest) {
  try {
    const { login, password } = (await req.json().catch(() => ({}))) as {
      login?: string;
      password?: string;
    };

    if (login !== ADMIN_LOGIN || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: 'Неверный логин или пароль' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: 'ok',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 4, // 4 часа
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: 'Ошибка авторизации' }, { status: 500 });
  }
}


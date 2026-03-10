import { NextResponse } from 'next/server';

const ADMIN_COOKIE_NAME = 'admin_session';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}


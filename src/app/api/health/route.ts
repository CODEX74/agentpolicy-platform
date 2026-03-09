import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { ok: false, error: 'DATABASE_URL не задан' },
        { status: 503 }
      );
    }
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Health check failed:', e);
    return NextResponse.json(
      { ok: false, error: 'Не удалось подключиться к Postgres' },
      { status: 503 }
    );
  }
}

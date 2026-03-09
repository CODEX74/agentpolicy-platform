import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db/mongoose';

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { ok: false, error: 'MONGODB_URI не задан в .env.local' },
        { status: 503 }
      );
    }
    await dbConnect();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Health check failed:', e);
    return NextResponse.json(
      {
        ok: false,
        error: 'Не удалось подключиться к MongoDB. Запустите MongoDB и проверьте MONGODB_URI в .env.local',
      },
      { status: 503 }
    );
  }
}

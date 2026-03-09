import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    await fs.mkdir(dataDir, { recursive: true });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Health check failed:', e);
    return NextResponse.json(
      { ok: false, error: 'Не удалось проверить хранилище' },
      { status: 503 }
    );
  }
}

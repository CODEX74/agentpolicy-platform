import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/options';
import { getTelegramIdByEmail, setTelegramIdForEmail } from '@/lib/db/user-telegram';

const bodySchema = z.object({
  telegramId: z.string().min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const telegramId = await getTelegramIdByEmail(session.user.email);
  return NextResponse.json({ telegramId: telegramId ?? null });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { telegramId } = bodySchema.parse(body);
    await setTelegramIdForEmail(session.user.email, telegramId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      const msg = err.errors.map((e) => e.message).join('; ');
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || 'Internal server error' }, { status: 500 });
  }
}


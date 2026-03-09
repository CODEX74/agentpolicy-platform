import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth/options';
import { getOpenAiKeyByEmail, setOpenAiKeyForEmail } from '@/lib/db/user-openai';

const bodySchema = z.object({
  openaiApiKey: z.string().min(10),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const key = await getOpenAiKeyByEmail(session.user.email);
  return NextResponse.json({ hasKey: Boolean(key) });
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { openaiApiKey } = bodySchema.parse(body);
    await setOpenAiKeyForEmail(session.user.email, openaiApiKey);
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


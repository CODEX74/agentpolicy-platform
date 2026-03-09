import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

/**
 * Отправка тестового сообщения в Telegram.
 * Вызов: GET /api/cron/test-telegram?secret=CRON_SECRET
 * или Authorization: Bearer CRON_SECRET
 * В ответе будет telegramSent и telegramError (если не удалось).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET not set. Add to .env.local' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const querySecret = req.nextUrl.searchParams.get('secret');
  if ((bearer ?? querySecret) !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.TELEGRAM_BOT_TOKEN?.trim() || !process.env.TELEGRAM_CHAT_ID?.trim()) {
    return NextResponse.json({
      ok: false,
      telegramSent: false,
      telegramError: 'TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в .env.local',
    });
  }

  const result = await sendTelegramMessage(
    `✅ Тест уведомлений AgentPolicy\n\nСообщения от бота доходят. Крон 24/7 будет присылать сюда отчёты по агентам.`
  );

  return NextResponse.json({
    ok: result.ok,
    telegramSent: result.ok,
    telegramError: result.error,
  });
}

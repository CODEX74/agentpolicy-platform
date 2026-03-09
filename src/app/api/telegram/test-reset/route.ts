import { NextRequest, NextResponse } from 'next/server';
import { resetAgentsDemoBalanceForUser } from '@/lib/db/file-agents';
import { deleteDemoTransactionsByEmail } from '@/lib/db/file-demo-transactions';
import { sendTelegramMessageToChat } from '@/lib/telegram';

/**
 * Ручной тест сброса и отправки в указанный чат.
 * Откройте в браузере (подставьте secret и свой chat_id):
 *   /api/telegram/test-reset?secret=CRON_SECRET&chat_id=ВАШ_CHAT_ID
 * Chat_id можно узнать: напишите боту @userinfobot в Telegram — он покажет ваш id.
 * Если после этого в бота пришло сообщение — отправка работает, проблема в доставке обновлений от Telegram в webhook.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const param = req.nextUrl.searchParams.get('secret');
  const chatIdParam = req.nextUrl.searchParams.get('chat_id');
  if (!secret || param !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!chatIdParam?.trim()) {
    return NextResponse.json({
      error: 'Укажите chat_id: /api/telegram/test-reset?secret=...&chat_id=ВАШ_CHAT_ID',
      hint: 'Напишите @userinfobot в Telegram, он покажет ваш id.',
    }, { status: 400 });
  }
  const userEmail = process.env.TELEGRAM_USER_EMAIL?.trim();
  if (!userEmail) {
    return NextResponse.json({ error: 'Задайте TELEGRAM_USER_EMAIL в .env.local' }, { status: 500 });
  }
  const r1 = await sendTelegramMessageToChat('Сбрасываю демо… (тест)', chatIdParam.trim());
  if (!r1.ok) {
    return NextResponse.json({ error: 'Не удалось отправить сообщение в Telegram', detail: r1.error }, { status: 502 });
  }
  try {
    const deleted = await deleteDemoTransactionsByEmail(userEmail);
    await resetAgentsDemoBalanceForUser(userEmail);
    const r2 = await sendTelegramMessageToChat(
      `Демо сброшено. Удалено транзакций: ${deleted}. Балансы восстановлены до изначальных.`,
      chatIdParam.trim()
    );
    return NextResponse.json({
      ok: true,
      deleted,
      firstMessageSent: r1.ok,
      secondMessageSent: r2.ok,
      secondError: r2.ok ? undefined : r2.error,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sendTelegramMessageToChat(`Ошибка сброса: ${msg.slice(0, 300)}`, chatIdParam.trim());
    return NextResponse.json({ error: 'Reset failed', detail: msg }, { status: 500 });
  }
}

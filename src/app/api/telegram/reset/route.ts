import { NextRequest, NextResponse } from 'next/server';
import { resetAgentsDemoBalanceForUser } from '@/lib/db/file-agents';
import { deleteDemoTransactionsByEmail } from '@/lib/db/file-demo-transactions';

/**
 * Выполняет сброс демо: удаляет все транзакции пользователя и восстанавливает балансы.
 * GET /api/telegram/reset?secret=CRON_SECRET
 * Используется скриптом telegram-polling при локальной проверке (webhook вызывает логику напрямую).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const param = req.nextUrl.searchParams.get('secret');
  if (!secret || param !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = process.env.TELEGRAM_USER_EMAIL?.trim();
  if (!userEmail) {
    return NextResponse.json({
      text: 'Задайте TELEGRAM_USER_EMAIL в .env.local (email пользователя).',
    });
  }
  try {
    const deleted = await deleteDemoTransactionsByEmail(userEmail);
    await resetAgentsDemoBalanceForUser(userEmail);
    return NextResponse.json({
      text: `Демо сброшено. Удалено транзакций: ${deleted}. Балансы агентов восстановлены до изначальных (как на сайте). Данные на сайте обновлены.`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Telegram reset]', err);
    return NextResponse.json({
      text: `Ошибка сброса: ${msg.slice(0, 400)}`,
    });
  }
}

/**
 * Отправка сообщений в Telegram через Bot API.
 * Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.local
 */

const TELEGRAM_API = 'https://api.telegram.org/bot';

export interface SendTelegramResult {
  ok: boolean;
  error?: string;
}

/** Отправить сообщение в указанный чат (для ответов в webhook) */
export async function sendTelegramMessageToChat(
  text: string,
  chatId: string
): Promise<SendTelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return { ok: false, error: 'TELEGRAM_BOT_TOKEN не задан' };
  const url = `${TELEGRAM_API}${token}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: String(chatId),
        text: text.slice(0, 4096),
        disable_web_page_preview: true,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (res.ok && data.ok) return { ok: true };
    const err = data?.description ?? res.statusText ?? `HTTP ${res.status}`;
    console.error('[Telegram] sendMessageToChat failed:', err);
    return { ok: false, error: err };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error('[Telegram] sendMessageToChat error:', err);
    return { ok: false, error: err };
  }
}

export async function sendTelegramMessage(text: string): Promise<SendTelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не заданы в .env.local' };
  }
  return sendTelegramMessageToChat(text, chatId);
}

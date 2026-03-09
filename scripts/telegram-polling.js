/**
 * Локальный опрос Telegram (getUpdates).
 * Используется как «эмулятор webhook»: каждое обновление пересылается в локальный /api/telegram/webhook.
 *
 * Запускать в отдельном терминале; сервер (npm run dev) должен быть запущен.
 * Загружает .env.local (TELEGRAM_BOT_TOKEN, NEXT_PUBLIC_APP_URL).
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        const value = trimmed.slice(idx + 1).trim();
        if (key && !process.env[key]) process.env[key] = value;
      }
    }
  });
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim();
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

if (!TOKEN) {
  console.error('Задайте TELEGRAM_BOT_TOKEN в .env.local');
  process.exit(1);
}

async function forwardToWebhook(update) {
  const res = await fetch(`${BASE_URL}/api/telegram/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  return res.ok;
}

async function run() {
  let offset = 0;
  console.log('Ожидание сообщений в Telegram (через polling → webhook). Остановка: Ctrl+C.');
  while (true) {
    try {
      const url = `https://api.telegram.org/bot${TOKEN}/getUpdates?timeout=30&offset=${offset}`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      const updates = data.result || [];
      for (const u of updates) {
        offset = u.update_id + 1;
        await forwardToWebhook(u);
      }
    } catch (e) {
      console.error(e.message || e);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

run();

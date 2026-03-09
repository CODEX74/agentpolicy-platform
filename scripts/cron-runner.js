/**
 * Локальный «крон»: каждые 5 минут вызывает GET /api/cron/run-agents.
 * Запускать в отдельном терминале рядом с npm run dev.
 *
 * Загружает .env.local из корня проекта (CRON_SECRET, NEXT_PUBLIC_APP_URL).
 *
 * Запуск: node scripts/cron-runner.js
 * Или: npm run cron
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

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const INTERVAL_MS = 5 * 60 * 1000;

if (!CRON_SECRET) {
  console.error('Задайте CRON_SECRET в .env.local и перезапустите скрипт.');
  process.exit(1);
}

async function run() {
  const url = `${BASE_URL}/api/cron/run-agents`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const data = await res.json().catch(() => ({}));
    const time = new Date().toLocaleTimeString('ru-RU');
    if (res.ok) {
      const ran = data.ran ?? 0;
      console.log(`[${time}] Крон OK: запущено агентов ${ran}. Telegram: ${data.telegramSent === true ? 'отправлено' : data.telegramSent === false ? 'ошибка — ' + (data.telegramError || '') : 'не настроен'}`);
      if (ran === 0 && data.hintEmpty) console.log('  Подсказка:', data.hintEmpty);
      if (data.telegramError) console.error('  Telegram error:', data.telegramError);
    } else {
      console.error(`[${time}] Крон ошибка ${res.status}:`, data.error || data);
    }
  } catch (e) {
    console.error(`[${new Date().toLocaleTimeString('ru-RU')}] Не удалось вызвать крон:`, e.message);
  }
}

console.log('Локальный крон 24/7: вызов каждые 5 минут. Остановка: Ctrl+C.');
console.log('URL:', BASE_URL + '/api/cron/run-agents');
run();
setInterval(run, INTERVAL_MS);

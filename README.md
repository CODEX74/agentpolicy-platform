# AgentWallet Platform

Платформа для управления финансами AI-агентов с визуальным конструктором политик. Интеграция с Coinbase CDP и Moltbook API.

## Стек

- **Next.js 16** (App Router)
- **TypeScript 5**
- **Tailwind CSS 4**
- **Файловое хранилище** (JSON в `data/`)
- **NextAuth.js**
- **Coinbase CDP (AgentKit)**
- **Vercel AI SDK**
- **Zustand**, **React Hook Form**, **Zod**, **Recharts**

## Быстрый старт

### 1. Установка

```bash
cd agentpolicy-platform
npm install
```

### 2. Переменные окружения

```bash
cp .env.example .env.local
```

Заполните в `.env.local`:

- `NEXTAUTH_URL` и `NEXTAUTH_SECRET` — для аутентификации
- `CDP_API_KEY_NAME` и `CDP_API_KEY_PRIVATE_KEY` — ключи из [Coinbase CDP Portal](https://portal.cdp.coinbase.com/projects/api-keys)
- При необходимости: `OPENAI_API_KEY` (для демо-режима агента: нейросеть принимает решения о покупке/продаже), `MOLTBOOK_API_KEY`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `WALLET_ENCRYPTION_KEY` — (опционально) секрет для шифрования приватных ключей кошельков, импортируемых пользователем. Если не задан, будет использован `NEXTAUTH_SECRET`, но для продакшена рекомендуется задать отдельный длинный случайный ключ.

**Важно:** не вставляйте API-ключи в чаты и не коммитьте их. Если ключ был показан посторонним — отзовите его в кабинете провайдера и создайте новый в `.env.local`.

Если OpenAI выдаёт «Country, region, or territory not supported» — используйте **Groq** (часто без ограничений по региону): зарегистрируйтесь на [console.groq.com](https://console.groq.com), создаьте API-ключ и добавьте в `.env.local` строку `GROQ_API_KEY=ваш_ключ`. ИИ-агент будет использовать Groq в первую очередь.

**Агенты 24/7 и Telegram:** уведомления приходят в Telegram, если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`. Проверка: откройте в браузере `GET /api/cron/test-telegram?secret=<CRON_SECRET>` — должно прийти тестовое сообщение.

- **На Vercel:** крон запускает агентов каждые 5 минут автоматически. Задайте `CRON_SECRET` в настройках проекта.
- **Локально (localhost):** расписание Vercel не работает. Запустите в **втором терминале** `npm run cron` — скрипт будет вызывать `/api/cron/run-agents` каждые 5 минут и в Telegram будут приходить отчёты. В первом терминале при этом должен работать `npm run dev`.

**Если агент не запускается каждые 5 минут:**
1. **Локально** — обязательно запустите `npm run cron` в отдельном терминале (рядом с `npm run dev`). Без этого крон не вызывается.
2. На странице агента включите переключатель **«Работать 24/7»** и задайте **демо-баланс** > 0. Крон запускает только агентов с этим режимом и положительным балансом.
3. **На Vercel** — проверьте, что в настройках проекта задан `CRON_SECRET`. На тарифе Hobby крон может иметь ограничения; для стабильной работы каждые 5 минут может потребоваться Pro.

### 3. Запуск

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000). Данные сохраняются в папке `data/` (пользователи, агенты, политики, демо-транзакции).

## Скрипты

| Команда              | Описание                                              |
|----------------------|--------------------------------------------------------|
| `npm run dev`        | Режим разработки                                      |
| `npm run cron`       | Локальный крон: каждые 5 мин вызывает агентов 24/7    |
| `npm run build`      | Сборка для продакшена                                 |
| `npm run start`      | Запуск собранного приложения                          |
| `npm run lint`       | Проверка линтером                                     |

## Структура проекта

- `src/app/` — страницы и API (App Router)
- `src/components/` — UI, layout, landing, dashboard, auth, providers
- `src/lib/` — db (Mongoose, модели), cdp, moltbook, auth, ai, utils, constants
- `src/hooks/` — useAgents, useWallet, usePolicies, useTransactions, useAnalytics, useMoltbook
- `src/store/` — Zustand (agentStore, walletStore, uiStore)
- `src/types/` — общие типы

## API

- `GET/POST /api/agents` — CRUD агентов
- `GET/PATCH/DELETE /api/agents/[id]`
- `POST /api/wallets/create` — создание кошелька (CDP)
- `GET /api/wallets/balance?address=...`
- `POST /api/wallets/transaction` — отправка транзакции (тело: `fromAddress`, `toAddress`, `valueWei` в wei строкой, опционально `agentId`). Требуются пользователь и кошелёк в MongoDB и настройка CDP.
- `GET/POST /api/policies` — политики
- `POST /api/policies/validate` — проверка транзакции по политике
- `GET/PATCH /api/agents/[id]/run24_7` — включить/выключить автозапуск агента 24/7
- `GET /api/cron/run-agents` — крон: запуск одного цикла для всех агентов с «Работать 24/7». Защита: `Authorization: Bearer <CRON_SECRET>` или `?secret=CRON_SECRET`. На Vercel крон **каждые 5 минут** задан в `vercel.json`; при деплое задайте `CRON_SECRET` в настройках проекта — Vercel будет подставлять его в запрос. Уведомления о действиях агентов отправляются в Telegram, если заданы `TELEGRAM_BOT_TOKEN` и `TELEGRAM_CHAT_ID`.
- `GET /api/cron/test-telegram?secret=<CRON_SECRET>` — отправить тестовое сообщение в Telegram (проверка, что бот и chat_id настроены).
- `POST /api/telegram/webhook` — вебхук для Telegram-бота: при сообщении `/balance` бот отвечает демо-балансом в USDT и купленной криптой по агентам. Нужны `TELEGRAM_BOT_TOKEN` и `TELEGRAM_USER_EMAIL`. Откройте в браузере **GET** `/api/telegram/webhook` — там будет статус (зарегистрирован ли webhook) и инструкция по регистрации. На localhost Telegram не шлёт обновления: запустите `npm run telegram-polling` в отдельном терминале — тогда `/balance` будет работать без webhook.
- `GET /api/moltbook/agents` — агенты Moltbook
- `POST /api/webhook/cdp` — вебхук CDP
- `GET /api/transactions` — список транзакций

### Пример: отправка транзакции

Нужна авторизация (cookie сессии). Тело запроса:

```json
{
  "fromAddress": "0x...адрес вашего кошелька...",
  "toAddress": "0x...адрес получателя...",
  "valueWei": "1000000000000000",
  "agentId": "id агента (опционально)"
}
```

`valueWei` — сумма в wei (строка). В интерфейсе валюта отображается как USDT.

**cURL** (подставьте свои адреса и включите cookie при необходимости):

```bash
curl -X POST http://localhost:3000/api/wallets/transaction \
  -H "Content-Type: application/json" \
  -d '{"fromAddress":"0x...","toAddress":"0x...","valueWei":"1000000000000000"}' \
  --cookie "next-auth.session-token=ВАШ_ТОКЕН"
```

**JavaScript (fetch из браузера, будучи залогиненным):**

```javascript
const res = await fetch('/api/wallets/transaction', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fromAddress: '0x...',   // адрес привязанного кошелька
    toAddress: '0x...',     // получатель
    valueWei: '1000000000000000',  // сумма в wei
    agentId: '...'          // опционально
  }),
  credentials: 'include'
});
const data = await res.json(); // { txHash: "0x..." } или { error: "..." }
```

## Безопасность

- Все ключи и секреты хранятся в `.env.local` (не коммитить).
- На API-роутах выполняется проверка сессии (NextAuth).
- Валидация входных данных через Zod.

### Импорт приватного ключа кошелька

- В кабинете агента (страница `/dashboard/agents/[id]`) в блоке кошелька есть секция **«Импорт приватного ключа (полный доступ агента)»**.
- Если вы укажете приватный ключ EVM-кошелька:
  - Ключ будет **зашифрован** на сервере с помощью `WALLET_ENCRYPTION_KEY` (или `NEXTAUTH_SECRET`) и сохранён в базе.
  - Агент сможет **самостоятельно отправлять транзакции** с этого адреса без подтверждения в MetaMask/Bybit Web3 (сервер подпишет транзакцию).
- Используйте эту возможность **только если полностью доверяете приложению** и понимаете риски передачи приватного ключа на сервер.

## Лицензия

Private.

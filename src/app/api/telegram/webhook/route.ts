import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { deleteDemoTransactionsByEmail, getDemoPositions, getDemoSpentToday } from '@/lib/db/demo-transactions';
import { getMarketPrices } from '@/lib/ai/agent-trader';
import { sendTelegramMessageToChat } from '@/lib/telegram';
import { getEmailByTelegramId } from '@/lib/db/user-telegram';
import { formatAssetQuantity } from '@/lib/utils/format';

/** Сообщение от Telegram (message или edited_message) */
interface TelegramMessage {
  chat: { id: number };
  text?: string;
}

/** Telegram Update payload */
interface TelegramUpdate {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

/** Извлечь команду из текста (учитываем entities bot_command и формат /cmd@bot) */
function getCommand(rawText: string): string {
  const t = rawText.trim();
  const first = t.split(/\s/)[0] ?? t;
  const cmd = first.split('@')[0]?.trim() ?? first;
  return cmd.toLowerCase();
}

/** Ключи — тикеры (BTC, SOL и т.д.), значения — цена в USD */
type MarketPrices = Record<string, number>;

function formatBalanceMessage(
  agents: { _id: string; name: string; demoBalance?: number }[],
  positionsByAgentId: Map<string, { asset: string; quantity: number; avgPriceUsd: number; totalUsdSpent: number }[]>,
  marketPrices: MarketPrices
): string {
  const lines = ['💰 Демо-баланс', ''];
  if (agents.length === 0) {
    return '💰 Демо-баланс\n\nНет агентов с демо-балансом. Создайте агента на сайте и установите демо-баланс.';
  }
  let totalUsdt = 0;
  for (const agent of agents) {
    const balance = agent.demoBalance ?? 0;
    totalUsdt += balance;
    const positions = positionsByAgentId.get(agent._id) ?? [];
    lines.push(`• ${agent.name}`);
    lines.push(`  USDT: ${balance}`);
    lines.push('  Позиции:');
    lines.push('');
    if (positions.length) {
      lines.push('Коин    Кол-Во ЦенаNow ЦенаBuy');
      let coinsTotalUsdt = 0;
      for (const p of positions) {
        const qty = formatAssetQuantity(p.quantity);
        const currentPriceUsd = marketPrices[p.asset] ?? 0;
        const valueNow = p.quantity * currentPriceUsd;
        coinsTotalUsdt += valueNow;
        lines.push(`    ${p.asset} — ${qty} — $${valueNow.toFixed(2)} — $${p.totalUsdSpent.toFixed(2)}`);
      }
      lines.push(`Всего монет на сумму USDT: ${coinsTotalUsdt.toFixed(2)} USDT`);
    } else {
      lines.push('Всего монет на сумму USDT: 0.00 USDT');
    }
    lines.push('');
  }
  lines.push(`Всего USDT: ${totalUsdt}`);
  return lines.join('\n').slice(0, 4096);
}

export async function GET(req: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin;
  const webhookUrl = `${appUrl.replace(/\/$/, '')}/api/telegram/webhook`;
  let webhookInfo: { url?: string } = {};
  if (token) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const data = (await res.json()) as { result?: { url?: string } };
      webhookInfo = data.result ?? {};
    } catch {
      webhookInfo = {};
    }
  }
  const hasWebhook = Boolean(webhookInfo.url);
  const isLocalhost = appUrl.includes('localhost');
  const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Telegram Webhook</title></head><body style="font-family:sans-serif;max-width:600px;margin:2rem auto;padding:1rem">
  <h1>Telegram бот: /balance, /resetbalance</h1>
  <p><strong>Токен задан:</strong> ${token ? 'да' : 'нет'}</p>
  <p><strong>TELEGRAM_USER_EMAIL:</strong> ${process.env.TELEGRAM_USER_EMAIL?.trim() ? 'задан' : 'не задан'}</p>
  <p><strong>Webhook зарегистрирован:</strong> ${hasWebhook ? 'да' : 'нет'}</p>
  ${hasWebhook ? `<p>URL: ${webhookInfo.url}</p>` : ''}
  ${isLocalhost ? `
  <p style="background:#fef3c7;padding:0.75rem;border-radius:6px"><strong>Сейчас вы на localhost.</strong> Telegram не отправляет обновления на localhost.</p>
  <p>Чтобы /balance работал локально:</p>
  <ol style="margin:0.5rem 0">
    <li>Задайте <code>TELEGRAM_USER_EMAIL</code> в .env.local (email, под которым вы на сайте).</li>
    <li>В отдельном терминале запустите: <code>npm run telegram-polling</code></li>
    <li>Напишите боту в Telegram: <code>/balance</code></li>
  </ol>
  <p>После деплоя на сервер с HTTPS зарегистрируйте webhook с вашим доменом (см. README).</p>
  <p><strong>Если /resetbalance не отвечает:</strong> откройте <code>/api/telegram/test-reset?secret=CRON_SECRET&chat_id=ВАШ_CHAT_ID</code> (chat_id узнайте у @userinfobot). Если сообщения придут — отправка работает, значит обновления от Telegram не доходят до webhook.</p>
  ` : !hasWebhook && token ? `
  <p>Чтобы бот реагировал на /balance, зарегистрируйте webhook. В браузере откройте (подставьте свой токен):</p>
  <p><code>https://api.telegram.org/bot&lt;ВАШ_ТОКЕН&gt;/setWebhook?url=${encodeURIComponent(webhookUrl)}</code></p>
  <p>Замените &lt;ВАШ_ТОКЕН&gt; на значение TELEGRAM_BOT_TOKEN. URL должен быть <strong>https</strong>.</p>
  ` : ''}
  <p style="margin-top:1.5rem;font-size:0.9em;color:#666">Если /resetbalance не отвечает: откройте <code>/api/telegram/test-reset?secret=CRON_SECRET&chat_id=ВАШ_CHAT_ID</code> (chat_id — у @userinfobot в Telegram). Если сообщения придут в бота — отправка работает.</p>
</body></html>`;
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TelegramUpdate;
    const msg = body.message ?? body.edited_message;
    const chatId = msg?.chat?.id;
    const rawText = (msg?.text ?? '').trim();
    console.log('[Telegram webhook]', { chatId, text: rawText.slice(0, 80), hasMessage: !!body.message, hasEdited: !!body.edited_message });
    if (chatId == null || !rawText) {
      return NextResponse.json({ ok: true });
    }
    const chatIdStr = String(chatId);
    const command = getCommand(rawText);

    // Определяем пользователя по chat_id (привязка делается в Настройки → Telegram)
    const userEmail = await getEmailByTelegramId(chatIdStr);

    // /resetbalance обрабатываем первым
    const looksLikeResetBalance = /^\/\s*resetbalance(\s|@|$)/i.test(rawText) || command === '/resetbalance';
    if (looksLikeResetBalance) {
      console.log('[Telegram webhook] handling /resetbalance', { rawText, command });
      if (!userEmail) {
        const r = await sendTelegramMessageToChat(
          `Аккаунт не привязан. Ваш chat id: ${chatIdStr}\nЗайдите на сайт → Настройки → Telegram и вставьте этот chat id.`,
          chatIdStr
        );
        if (!r.ok) console.error('[Telegram webhook] send failed:', r.error);
        return NextResponse.json({ ok: true });
      }
      const r1 = await sendTelegramMessageToChat('Сбрасываю демо…', chatIdStr);
      if (!r1.ok) console.error('[Telegram webhook] /resetbalance first message failed:', r1.error);
      try {
        const deleted = await deleteDemoTransactionsByEmail(userEmail);
        const user = await prisma.user.findUnique({ where: { email: userEmail } });
        if (user) {
          const agents = await prisma.agent.findMany({ where: { userId: user.id } });
          for (const a of agents) {
            const target = a.initialDemoBalance ?? a.demoBalance ?? 0;
            await prisma.agent.update({
              where: { id: a.id },
              data: { demoBalance: target, initialDemoBalance: a.initialDemoBalance ?? a.demoBalance },
            });
          }
        }
        const r2 = await sendTelegramMessageToChat(
          `Демо сброшено. Удалено транзакций: ${deleted}. Балансы агентов восстановлены до изначальных (как на сайте). Данные на сайте обновлены.`,
          chatIdStr
        );
        if (!r2.ok) console.error('[Telegram webhook] /resetbalance second message failed:', r2.error);
      } catch (err) {
        const msgErr = err instanceof Error ? err.message : String(err);
        console.error('[Telegram webhook] /resetbalance error', err);
        await sendTelegramMessageToChat(`Ошибка сброса: ${msgErr.slice(0, 300)}`, chatIdStr);
      }
      return NextResponse.json({ ok: true });
    }

    // /daily — оставшийся дневной лимит (широкое распознавание, как у /resetbalance)
    const looksLikeDaily = /^\/\s*daily(\s|@|$)/i.test(rawText) || command === '/daily';
    if (looksLikeDaily) {
      console.log('[Telegram webhook] handling /daily', { rawText, command });
      if (!userEmail) {
        await sendTelegramMessageToChat(
          `Аккаунт не привязан. Ваш chat id: ${chatIdStr}\nЗайдите на сайт → Настройки → Telegram и вставьте этот chat id.`,
          chatIdStr
        );
        return NextResponse.json({ ok: true });
      }
      await sendTelegramMessageToChat('Проверяю лимиты…', chatIdStr);
      try {
        const user = await prisma.user.findUnique({
          where: { email: userEmail },
          include: { agents: true },
        });
        const agents = user?.agents ?? [];
        if (agents.length === 0) {
          await sendTelegramMessageToChat(
            '📅 Оставшийся дневной лимит\n\nНет агентов. Создайте агента на сайте и настройте политику.',
            chatIdStr
          );
          return NextResponse.json({ ok: true });
        }
        const lines = ['📅 Оставшийся дневной лимит', ''];
        for (const agent of agents) {
          const policy = await prisma.policy.findUnique({
            where: { userId_agentId: { userId: user!.id, agentId: agent.id } },
          });
          const dailyLimit = policy?.dailyLimit ?? -1;
          const spentToday = await getDemoSpentToday(agent.id, userEmail);
          if (dailyLimit < 0) {
            lines.push(`• ${agent.name}: без лимита (потрачено сегодня: ${spentToday.toFixed(2)} USDT)`);
          } else {
            const remaining = Math.max(0, dailyLimit - spentToday);
            lines.push(`• ${agent.name}: ${remaining.toFixed(2)} USDT из ${dailyLimit} (потрачено сегодня: ${spentToday.toFixed(2)} USDT)`);
          }
        }
        const r = await sendTelegramMessageToChat(lines.join('\n'), chatIdStr);
        if (!r.ok) console.error('[Telegram webhook] /daily second message failed:', r.error);
      } catch (err) {
        const msgErr = err instanceof Error ? err.message : String(err);
        console.error('[Telegram webhook] /daily error', err);
        await sendTelegramMessageToChat(`Ошибка: ${msgErr.slice(0, 300)}`, chatIdStr);
      }
      return NextResponse.json({ ok: true });
    }

    if (command === '/start') {
      const base =
        'Команды:\n/balance — демо-баланс и позиции по агентам\n/daily — оставшийся дневной лимит по агентам\n/resetbalance — очистить демо-транзакции и восстановить балансы';
      const linkInfo = userEmail
        ? `\n\n✅ Аккаунт привязан: ${userEmail}`
        : `\n\n⚠️ Аккаунт не привязан.\nВаш chat id: ${chatIdStr}\nЗайдите на сайт → Настройки → Telegram и вставьте этот chat id.`;
      await sendTelegramMessageToChat(base + linkInfo, chatIdStr);
      return NextResponse.json({ ok: true });
    }

    if (command === '/balance') {
      if (!userEmail) {
        await sendTelegramMessageToChat(
          `Аккаунт не привязан. Ваш chat id: ${chatIdStr}\nЗайдите на сайт → Настройки → Telegram и вставьте этот chat id.`,
          chatIdStr
        );
        return NextResponse.json({ ok: true });
      }

      const [userData, marketPrices] = await Promise.all([
        prisma.user.findUnique({
          where: { email: userEmail },
          include: { agents: true },
        }),
        getMarketPrices(),
      ]);
      const agents = userData?.agents ?? [];
      const agentsForMsg = agents.map((a) => ({ _id: a.id, name: a.name, demoBalance: a.demoBalance ?? 0 }));
      const positionsByAgentId = new Map<string, { asset: string; quantity: number; avgPriceUsd: number; totalUsdSpent: number }[]>();
      for (const agent of agents) {
        const positions = await getDemoPositions(agent.id, userEmail);
        positionsByAgentId.set(agent.id, positions);
      }

      const message = formatBalanceMessage(agentsForMsg, positionsByAgentId, marketPrices);
      await sendTelegramMessageToChat(message, chatIdStr);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[Telegram webhook]', e);
    return NextResponse.json({ ok: true });
  }
}

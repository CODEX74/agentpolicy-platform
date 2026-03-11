import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDemoPositions } from '@/lib/db/demo-transactions';
import { getMarketPrices } from '@/lib/ai/agent-trader';
import { formatAssetQuantity } from '@/lib/utils/format';

/**
 * Возвращает текст сообщения «демо-баланс» для отправки в Telegram.
 * Вызов: GET /api/telegram/balance?secret=CRON_SECRET
 * Используется скриптом telegram-polling при локальной проверке без webhook.
 * Формат позиций: МОНЕТА — КОЛИЧЕСТВО — ЦЕНА СЕЙЧАС — ЦЕНА ПОКУПКИ.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const param = req.nextUrl.searchParams.get('secret');
  if (!secret || param !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const userEmail = process.env.TELEGRAM_USER_EMAIL?.trim();
  if (!userEmail) {
    return NextResponse.json({ text: 'Задайте TELEGRAM_USER_EMAIL в .env.local' });
  }
  const [userData, marketPrices] = await Promise.all([
    prisma.user.findUnique({ where: { email: userEmail } }),
    getMarketPrices(),
  ]);
  const agents = userData
    ? await prisma.agent.findMany({ where: { userId: userData.id } })
    : [];
  const positionsByAgentId = new Map<string, { asset: string; quantity: number; avgPriceUsd: number; totalUsdSpent: number }[]>();
  for (const agent of agents) {
    const positions = await getDemoPositions(agent.id, userEmail);
    positionsByAgentId.set(agent.id, positions);
  }
  const lines = ['💰 Демо-баланс', ''];
  if (agents.length === 0) {
    return NextResponse.json({ text: '💰 Демо-баланс\n\nНет агентов с демо-балансом.' });
  }
  let totalUsdt = 0;
  for (const agent of agents) {
    const balance = agent.demoBalance ?? 0;
    totalUsdt += balance;
    const positions = positionsByAgentId.get(agent.id) ?? [];
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
  return NextResponse.json({ text: lines.join('\n').slice(0, 4096) });
}

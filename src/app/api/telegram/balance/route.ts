import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getDemoPositions } from '@/lib/db/demo-transactions';
import { getMarketPrices } from '@/lib/ai/agent-trader';
import { getRealWalletBalance } from '@/lib/agents/realWallet';
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
  const agents = userData ? await prisma.agent.findMany({ where: { userId: userData.id } }) : [];
  const positionsByAgentId = new Map<
    string,
    { asset: string; quantity: number; avgPriceUsd: number; totalUsdSpent: number }[]
  >();

  const demoAgents = agents.filter((a) => a.agentMode === 'DEMO');
  // Реальными считаем как классические WALLET-агенты, так и тех,
  // у кого уже есть привязанный realWalletAddress (на случай старых агентов).
  const realAgents = agents.filter(
    (a) => a.agentMode === 'WALLET' || !!a.realWalletAddress
  );

  for (const agent of demoAgents) {
    const positions = await getDemoPositions(agent.id, userEmail);
    positionsByAgentId.set(agent.id, positions);
  }
  const lines = ['💰 Демо-баланс', ''];
  if (demoAgents.length === 0) {
    lines.push('Нет агентов с демо-балансом.');
  }

  let totalDemoUsdt = 0;
  for (const agent of demoAgents) {
    const balance = agent.demoBalance ?? 0;
    totalDemoUsdt += balance;
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

  lines.push(`Всего USDT по демо: ${totalDemoUsdt.toFixed(2)}`);
  lines.push('');
  lines.push('💼 Реальные кошельки');
  lines.push('');

  let totalRealEth = 0;

  if (!userData || realAgents.length === 0) {
    lines.push('Нет агентов с реальными кошельками.');
  } else {
    for (const agent of realAgents) {
      const { balanceWei } = await getRealWalletBalance(agent.id, userData.id);
      const weiNum = Number(balanceWei || '0');
      const balanceEth = Number.isFinite(weiNum) ? weiNum / 1e18 : 0;
      totalRealEth += balanceEth;

      const maxPosEth = agent.realMaxPositionUsd ?? null;
      const dailyLimitEth = agent.realDailyLimitUsd ?? null;

      lines.push(`• ${agent.name}`);
      lines.push(`  Баланс: ${balanceEth.toFixed(6)} ETH`);

      // #region agent log
      fetch('http://127.0.0.1:7866/ingest/f2b1bcb0-5cd1-4cfb-a22c-e4590e10ebab', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Debug-Session-Id': '57b590',
        },
        body: JSON.stringify({
          sessionId: '57b590',
          runId: 'telegram-balance',
          hypothesisId: 'H-balance',
          location: 'src/app/api/telegram/balance/route.ts:real-loop',
          message: 'Real agent balance line',
          data: {
            agentId: agent.id,
            agentName: agent.name,
            agentMode: agent.agentMode,
            realWalletNetwork: agent.realWalletNetwork,
            realWalletAddress: agent.realWalletAddress,
            balanceWei,
            balanceEth,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion agent log

      if (maxPosEth != null || dailyLimitEth != null) {
        lines.push(
          `  Лимиты: макс позиция ${maxPosEth ?? '-'} ETH / дневной лимит ${dailyLimitEth ?? '-'} ETH`
        );
      }
      lines.push('');
    }
  }

  lines.push(`Итого по реальным кошелькам: ${totalRealEth.toFixed(6)} ETH`);

  return NextResponse.json({ text: lines.join('\n').slice(0, 4096) });
}


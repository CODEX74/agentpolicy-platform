import { getDemoTransactionsByEmail } from '@/lib/db/demo-transactions';
import { prisma } from '@/lib/db/prisma';
import { getMarketPrices, getUsdtPriceUsd } from '@/lib/ai/agent-trader';

export interface UnifiedTransaction {
  _id: string;
  type: string;
  amount: number;
  currency: string;
  toAddress?: string | null;
  status: string;
  createdAt: string;
  /** Демо-операция агента (демо-баланс) */
  isDemo?: boolean;
  /** Причина/комментарий (для демо и реальных) */
  reason?: string;
  agentId?: string;
  /** Актив (ETH, BTC, SOL и т.д.) */
  asset?: string;
  /** Обоснование цены и выбора актива */
  priceReason?: string;
  /** Срок удержания в днях */
  termDays?: number;
  /** Планы по позиции */
  plans?: string;
  /** Цена актива в USD на момент покупки */
  assetPriceUsd?: number;
  /** Сумма в USDT (для реальных — amountUsd из БД) */
  amountUsd?: number;
  /** Комиссия сети/свапа в USD (для реальных транзакций) */
  feeUsd?: number;
}

/**
 * Список демо-транзакций пользователя (для вкладки «Транзакции» и аналитики).
 */
export async function getMergedTransactionsForEmail(
  email: string,
  limit = 100
): Promise<UnifiedTransaction[]> {
  // #region agent log
  fetch('http://127.0.0.1:7866/ingest/34541abd-a618-492c-8a7a-56d67fc008ed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6fdb07' },
    body: JSON.stringify({
      sessionId: '6fdb07',
      location: 'transactions-merged.ts:getMergedTransactionsForEmail',
      message: 'getMergedTransactionsForEmail called (demo only)',
      data: { limit },
      timestamp: Date.now(),
      hypothesisId: 'H4',
    }),
  }).catch(() => {});
  // #endregion
  const demoRows = await getDemoTransactionsByEmail(email);
  const demoMapped: UnifiedTransaction[] = demoRows.map((t) => ({
    _id: t._id,
    type: t.type,
    amount: t.amountEth,
    currency: 'USDT',
    toAddress: null,
    status: 'demo',
    createdAt: t.createdAt,
    isDemo: true,
    reason: t.reason,
    agentId: t.agentId,
    asset: t.asset,
    priceReason: t.priceReason,
    termDays: t.termDays,
    plans: t.plans,
    assetPriceUsd: t.assetPriceUsd,
  }));

  // #region agent log
  if (demoMapped[0]) {
    fetch('http://127.0.0.1:7866/ingest/34541abd-a618-492c-8a7a-56d67fc008ed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6fdb07' },
      body: JSON.stringify({
        sessionId: '6fdb07',
        location: 'transactions-merged.ts:getMergedTransactionsForEmail:demoMapped',
        message: 'demo first item reason/termDays/feeUsd',
        data: {
          reason: demoMapped[0].reason,
          termDays: demoMapped[0].termDays,
          feeUsd: demoMapped[0].feeUsd,
          hasAmountUsd: 'amountUsd' in demoMapped[0],
        },
        timestamp: Date.now(),
        hypothesisId: 'H5',
      }),
    }).catch(() => {});
  }
  // #endregion

  return demoMapped
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Список реальных транзакций пользователя (для раздела «Транзакции по настоящим балансам»).
 */
export async function getRealTransactionsForEmail(
  email: string,
  limit = 100
): Promise<UnifiedTransaction[]> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return [];

  const [rows, marketPrices, usdtPrice] = await Promise.all([
    prisma.realTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    getMarketPrices(),
    getUsdtPriceUsd(),
  ]);

  const ethPriceUsd = marketPrices.ETH ?? usdtPrice ?? 1;

  // #region agent log
  const firstRow = rows[0];
  if (firstRow) {
    const rawKeys = Object.keys(firstRow) as (keyof typeof firstRow)[];
    fetch('http://127.0.0.1:7866/ingest/34541abd-a618-492c-8a7a-56d67fc008ed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6fdb07' },
      body: JSON.stringify({
        sessionId: '6fdb07',
        location: 'transactions-merged.ts:getRealTransactionsForEmail',
        message: 'real tx first row from DB',
        data: {
          rowCount: rows.length,
          firstRawReason: firstRow.reason,
          firstRawTermDays: firstRow.termDays,
          firstRawFeeUsd: firstRow.feeUsd,
          rawKeys: rawKeys.filter((k) => ['reason', 'termDays', 'feeUsd'].includes(k)),
        },
        timestamp: Date.now(),
        hypothesisId: 'H1',
      }),
    }).catch(() => {});
  }
  fetch('http://127.0.0.1:7866/ingest/34541abd-a618-492c-8a7a-56d67fc008ed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6fdb07' },
    body: JSON.stringify({
      sessionId: '6fdb07',
      location: 'transactions-merged.ts:getRealTransactionsForEmail',
      message: 'getRealTransactionsForEmail called',
      data: { rowCount: rows.length },
      timestamp: Date.now(),
      hypothesisId: 'H4',
    }),
  }).catch(() => {});
  // #endregion

  const mapped: UnifiedTransaction[] = rows
    .filter((t) => t.amountUsd >= 0.1)
    .map((t) => {
      const assetPriceUsd = marketPrices[t.asset] ?? 1;
      const tokenAmount =
        assetPriceUsd > 0 && Number.isFinite(assetPriceUsd)
          ? t.amountUsd / assetPriceUsd
          : t.amountUsd;
      return {
        _id: t.id,
        type: t.side === 'sell' ? 'sell_coin' : 'buy_coin',
        amount: tokenAmount,
        currency: t.asset ?? 'ETH',
        toAddress: t.walletAddress,
        status: 'real',
        createdAt: t.createdAt.toISOString(),
        isDemo: false,
        asset: t.asset,
        reason: t.reason ?? undefined,
        amountUsd: t.amountUsd,
        termDays: t.termDays ?? undefined,
        feeUsd: t.feeUsd ?? undefined,
      };
    });

  // #region agent log
  if (mapped[0]) {
    fetch('http://127.0.0.1:7866/ingest/34541abd-a618-492c-8a7a-56d67fc008ed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6fdb07' },
      body: JSON.stringify({
        sessionId: '6fdb07',
        location: 'transactions-merged.ts:getRealTransactionsForEmail:mapped',
        message: 'real tx first mapped',
        data: {
          reason: mapped[0].reason,
          termDays: mapped[0].termDays,
          feeUsd: mapped[0].feeUsd,
        },
        timestamp: Date.now(),
        hypothesisId: 'H3',
      }),
    }).catch(() => {});
  }
  // #endregion

  return mapped;
}


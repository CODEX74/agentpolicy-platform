import { getDemoTransactionsByEmail } from '@/lib/db/demo-transactions';
import { prisma } from '@/lib/db/prisma';

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
  /** Причина/комментарий (для демо) */
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
}

/**
 * Список демо-транзакций пользователя (для вкладки «Транзакции» и аналитики).
 */
export async function getMergedTransactionsForEmail(
  email: string,
  limit = 100
): Promise<UnifiedTransaction[]> {
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

  const rows = await prisma.realTransaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const mapped: UnifiedTransaction[] = rows.map((t) => ({
    _id: t.id,
    type: t.side === 'sell' ? 'sell_coin' : 'buy_coin',
    amount: t.amountUsd,
    currency: 'USDT',
    toAddress: t.walletAddress,
    status: 'real',
    createdAt: t.createdAt.toISOString(),
    isDemo: false,
    asset: t.asset,
  }));

  return mapped;
}


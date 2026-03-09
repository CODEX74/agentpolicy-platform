import dbConnect from '@/lib/db/mongoose';
import Transaction from '@/lib/db/models/Transaction';
import User from '@/lib/db/models/User';
import { getDemoTransactionsByEmail } from '@/lib/db/file-demo-transactions';

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
 * Объединённый список: транзакции из MongoDB (если есть пользователь) + демо-транзакции по email.
 * Для вкладки «Транзакции» и единого API.
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

  let mongoList: UnifiedTransaction[] = [];
  try {
    const db = await dbConnect();
    if (db) {
      const user = await User.findOne({ email }).lean();
      if (user) {
        const mongoTx = await Transaction.find({ userId: user._id })
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();
        mongoList = mongoTx.map((t: { _id: unknown; type: string; amount: number; currency?: string; toAddress?: string | null; status: string; createdAt: Date }) => ({
          _id: String(t._id),
          type: t.type,
          amount: t.amount,
          currency: t.currency ?? 'USDT',
          toAddress: t.toAddress ?? null,
          status: t.status,
          createdAt: typeof t.createdAt === 'string' ? t.createdAt : new Date(t.createdAt).toISOString(),
          isDemo: false,
        }));
      }
    }
  } catch {
    // MongoDB недоступен — только демо
  }

  const merged = [...mongoList, ...demoMapped].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return merged.slice(0, limit);
}

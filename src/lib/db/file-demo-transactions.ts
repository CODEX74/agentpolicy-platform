import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'demo-transactions.json');

export interface DemoTransaction {
  _id: string;
  agentId: string;
  userEmail: string;
  type: 'buy_eth' | 'sell_eth' | 'transfer' | 'hold';
  amountEth: number;
  /** Причина от ИИ */
  reason: string;
  /** Цена USDT на момент решения (если применимо) */
  marketPriceUsd?: number;
  /** Какой актив куплен/продан (ETH, BTC, SOL и т.д.) */
  asset?: string;
  /** Обоснование: почему этот актив и по какой цене */
  priceReason?: string;
  /** Срок удержания в днях (при покупке) */
  termDays?: number;
  /** Планы по позиции (перепродажа через месяц и т.д.) */
  plans?: string;
  /** Цена актива в USD на момент покупки (для отчётов) */
  assetPriceUsd?: number;
  createdAt: string;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function read(): Promise<DemoTransaction[]> {
  try {
    await ensureDir();
    const raw = await fs.readFile(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function write(rows: DemoTransaction[]) {
  await ensureDir();
  await fs.writeFile(FILE_PATH, JSON.stringify(rows, null, 2), 'utf-8');
}

export async function getDemoTransactionsByAgent(
  agentId: string,
  userEmail: string
): Promise<DemoTransaction[]> {
  const rows = await read();
  const lower = userEmail.toLowerCase().trim();
  return rows
    .filter((t) => t.agentId === agentId && t.userEmail.toLowerCase() === lower)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Все демо-транзакции пользователя (для вкладки «Транзакции» и аналитики) */
export async function getDemoTransactionsByEmail(userEmail: string): Promise<DemoTransaction[]> {
  const rows = await read();
  const lower = userEmail.toLowerCase().trim();
  return rows
    .filter((t) => t.userEmail.toLowerCase() === lower)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** Удалить все демо-транзакции пользователя (для команды /reset в боте). */
export async function deleteDemoTransactionsByEmail(userEmail: string): Promise<number> {
  const rows = await read();
  const lower = userEmail.toLowerCase().trim();
  const before = rows.length;
  const filtered = rows.filter((t) => t.userEmail.toLowerCase() !== lower);
  if (filtered.length === before) return 0;
  await write(filtered);
  return before - filtered.length;
}

export async function addDemoTransaction(params: {
  agentId: string;
  userEmail: string;
  type: DemoTransaction['type'];
  amountEth: number;
  reason: string;
  marketPriceUsd?: number;
  asset?: string;
  priceReason?: string;
  termDays?: number;
  plans?: string;
  assetPriceUsd?: number;
}): Promise<DemoTransaction> {
  const rows = await read();
  const now = new Date().toISOString();
  const id = `demo-tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const tx: DemoTransaction = {
    _id: id,
    agentId: params.agentId,
    userEmail: params.userEmail.toLowerCase().trim(),
    type: params.type,
    amountEth: params.amountEth,
    reason: params.reason,
    marketPriceUsd: params.marketPriceUsd,
    asset: params.asset,
    priceReason: params.priceReason,
    termDays: params.termDays,
    plans: params.plans,
    assetPriceUsd: params.assetPriceUsd,
    createdAt: now,
  };
  rows.push(tx);
  await write(rows);
  return tx;
}

/** Сумма потраченного за день (USDT) по агенту — для проверки dailyLimit */
export async function getDemoSpentToday(agentId: string, userEmail: string): Promise<number> {
  const rows = await getDemoTransactionsByAgent(agentId, userEmail);
  const today = new Date().toDateString();
  return rows
    .filter((t) => new Date(t.createdAt).toDateString() === today && t.type !== 'hold')
    .reduce((sum, t) => sum + t.amountEth, 0);
}

/** Сумма за неделю */
export async function getDemoSpentThisWeek(agentId: string, userEmail: string): Promise<number> {
  const rows = await getDemoTransactionsByAgent(agentId, userEmail);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return rows
    .filter((t) => new Date(t.createdAt) >= weekAgo && t.type !== 'hold')
    .reduce((sum, t) => sum + t.amountEth, 0);
}

export interface DemoPosition {
  asset: string;
  /** Количество крипты */
  quantity: number;
  /** Потрачено USDT на эту позицию */
  totalUsdSpent: number;
  /** Средняя цена покупки в USD */
  avgPriceUsd: number;
}

/** Позиции агента по купленной крипте (из покупок buy_eth) */
export async function getDemoPositions(
  agentId: string,
  userEmail: string
): Promise<DemoPosition[]> {
  const rows = await getDemoTransactionsByAgent(agentId, userEmail);
  const buys = rows.filter((t) => t.type === 'buy_eth' && t.amountEth > 0 && t.asset);
  const byAsset = new Map<string, { totalUsd: number; quantity: number }>();
  for (const t of buys) {
    const asset = t.asset ?? 'USDT';
    // Используем только цену актива на момент покупки; иначе quantity будет неверным (например 70 USDT / 1 = 70 SOL).
    const price = t.assetPriceUsd && t.assetPriceUsd > 0 ? t.assetPriceUsd : null;
    if (price == null) continue; // Пропускаем покупки без сохранённой цены актива
    const quantity = t.amountEth / price;
    const cur = byAsset.get(asset) ?? { totalUsd: 0, quantity: 0 };
    byAsset.set(asset, {
      totalUsd: cur.totalUsd + t.amountEth,
      quantity: cur.quantity + quantity,
    });
  }
  return Array.from(byAsset.entries()).map(([asset, { totalUsd, quantity }]) => ({
    asset,
    quantity,
    totalUsdSpent: totalUsd,
    avgPriceUsd: quantity > 0 ? totalUsd / quantity : 0,
  }));
}

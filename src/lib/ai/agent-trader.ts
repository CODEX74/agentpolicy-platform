import { generateObject, generateText } from 'ai';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { logger } from '@/lib/utils/logger';

/** Groq через OpenAI-совместимый API (обходит ограничение @ai-sdk/groq v1/v2). */
function getGroqProvider() {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return createOpenAI({
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: key,
  });
}

const decisionSchema = z.object({
  action: z.enum(['buy_coin', 'sell_coin', 'transfer', 'hold']),
  amountEth: z.number().min(0).max(100).optional(),
  reason: z.string(),
  /** Какой актив покупать/продавать: тикер (ETH, BTC, SOL и т.д.) */
  asset: z.string().max(20).optional(),
  /** Обоснование: почему именно этот актив и по какой цене (при покупке/продаже) */
  priceReason: z.string().max(500).optional(),
  /** На сколько дней планируется держать позицию (при покупке) */
  termDays: z.number().min(0).max(365).optional(),
  /** Для трейдера: через сколько минут планируется закрыть сделку (5–30). */
  termMinutes: z.number().min(0).max(24 * 60).optional(),
  /** Планы по позиции (например: перепродажа через месяц, держать до целевой цены) */
  plans: z.string().max(500).optional(),
});

export type AgentTradeDecision = z.infer<typeof decisionSchema>;

/** Цены активов с CoinGecko (id → цена USD) */
export type MarketPrices = Record<string, number>;

export interface AgentTraderInput {
  agentName: string;
  agentType: 'INVESTOR' | 'TRADER';
  demoBalanceEth: number;
  policy: {
    dailyLimit: number;
    weeklyLimit: number;
    maxPerTransaction: number;
    allowedOperations: string[];
  };
  spentTodayEth: number;
  spentWeekEth: number;
  ethPriceUsd: number;
  /** Цены криптоактивов в USD (например { ETH: 3500, BTC: 97000 }) */
  marketPrices: MarketPrices;
  /** Простой тренд за последние "свечи" (мок: up / down / stable) */
  marketTrend: 'up' | 'down' | 'stable';
}

/** CoinGecko id → тикер для отображения */
const COIN_ID_TO_TICKER: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  solana: 'SOL',
  tether: 'USDT',
  'usd-coin': 'USDC',
  binancecoin: 'BNB',
  ripple: 'XRP',
  cardano: 'ADA',
  dogecoin: 'DOGE',
  'avalanche-2': 'AVAX',
  chainlink: 'LINK',
  polkadot: 'DOT',
  polygon: 'MATIC',
  litecoin: 'LTC',
  tron: 'TRX',
};

/**
 * Получить текущую цену USDT в USD (Coingecko; обычно ~1).
 */
export async function getUsdtPriceUsd(): Promise<number> {
  const prices = await getMarketPrices();
  return prices['USDT'] ?? prices['tether'] ?? 1;
}

/**
 * Получить цены нескольких криптоактивов в USD (CoinGecko).
 * Ключи результата: тикеры (BTC, ETH, SOL, USDT и т.д.).
 */
export async function getMarketPrices(): Promise<MarketPrices> {
  const ids = ['bitcoin', 'ethereum', 'solana', 'tether', 'usd-coin', 'binancecoin', 'ripple', 'cardano', 'dogecoin', 'avalanche-2'];
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(',')}&vs_currencies=usd`,
      { next: { revalidate: 60 } }
    );
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const out: MarketPrices = {};
    for (const [id, val] of Object.entries(data)) {
      const ticker = COIN_ID_TO_TICKER[id] ?? id.toUpperCase().slice(0, 6);
      if (typeof val?.usd === 'number') out[ticker] = val.usd;
    }
    if (Object.keys(out).length === 0) out['USDT'] = 1;
    return out;
  } catch (e) {
    logger.error('getMarketPrices', e);
    // При сбое API — примерные цены, чтобы покупки SOL/AVAX и др. сохранялись с assetPriceUsd
    return {
      USDT: 1,
      ETH: 3000,
      BTC: 90000,
      SOL: 180,
      BNB: 600,
      XRP: 0.5,
      ADA: 0.4,
      DOGE: 0.08,
      AVAX: 35,
    };
  }
}

/** @deprecated Используйте getUsdtPriceUsd */
export async function getEthPriceUsd(): Promise<number> {
  return getUsdtPriceUsd();
}

export interface AgentTradeResult {
  decision: AgentTradeDecision | null;
  error?: string;
}

/**
 * Нейросеть решает: купить/продать любой актив, перевести или держать.
 * При покупке обязательно: обоснование (reason), почему этот актив и по какой цене (priceReason), срок удержания в днях (termDays).
 */
const AGENT_PROMPT = (input: AgentTraderInput) => {
  const pricesLine = Object.entries(input.marketPrices)
    .map(([ticker, usd]) => `${ticker}=$${usd}`)
    .join(', ');
  const opsRu = (input.policy.allowedOperations || []).map((o) => ({ buy: 'Покупка', sell: 'Продажа', swap: 'Обмен', hold: 'Удержание' }[o] ?? o)).join(', ') || 'Покупка, Удержание';
  const styleBlock =
    input.agentType === 'INVESTOR'
      ? `Стиль: ИНВЕСТОР (долгосрок).
- Покупки только с горизонтом удержания минимум 10 дней.
- При buy_coin обязательно ставь termDays >= 10 и в plans опиши сценарий выхода (например, по цели/по времени).
- Продажа (sell_coin) для инвестора допустима только если прошло 10+ дней с момента покупки, либо если цена резко упала (сильная просадка).
- Не делай коротких "скальп" сделок и не указывай termMinutes.`
      : `Стиль: ТРЕЙДЕР (интрадей).
- Ищешь быстрые сделки: горизонт 5–30 минут.
- При buy_coin обязательно укажи termMinutes в диапазоне 5–30, а termDays не указывай.
- Ты можешь делать sell_coin, когда есть позиция по asset и есть причина закрыть сделку (достижение цели/стоп/слабость тренда).`;
  return `Ты — автономный торговый агент, работающий 24/7. Ты можешь покупать криптовалюту за USDT (ETH, BTC, SOL, BNB, AVAX и т.д.). Решения только при возможности прибыли; в сомнениях — hold.

Правила:
- Не покупай USDT: баланс уже в USDT. При покупке (buy_coin) указывай только криптоактивы: ETH, BTC, SOL, BNB, AVAX, XRP, ADA, DOGE и т.д. Если по ошибке выбран USDT — отвечай hold.
- Действуй (buy_coin, sell_coin, transfer) только при ясной выгоде. При покупке обязательно укажи: какой актив (asset), обоснование (reason), почему этот актив и по какой цене (priceReason), на сколько дней держишь (termDays).
- Без явной выгоды оставляй hold.
- Обязательно учитывай новости и события: макроэкономику (ставки ФРС, инфляцию, отчёты), регуляторные новости (ETF, запреты/разрешения, иски SEC), крупные события в блокчейнах (форки, атаки, взломы, делистинги, листинги).
- Если новости явно усиливают риск (регуляторный прессинг, взлом сети, запреты, сильный негатив по активу) — избегай агрессивных покупок и при необходимости сокращай позицию. Если новости поддерживают тренд (одобрение ETF, институциональный спрос, технологические апдейты) — можешь усиливать позицию, но всегда в рамках лимитов политики.

${styleBlock}

Агент: ${input.agentName}
Тип агента: ${input.agentType}
Демо-баланс: ${input.demoBalanceEth} USDT
Политика: дневной лимит ${input.policy.dailyLimit} USDT, недельный ${input.policy.weeklyLimit} USDT, макс. за транзакцию ${input.policy.maxPerTransaction} USDT. Разрешённые операции: ${opsRu}.
Уже потрачено сегодня: ${input.spentTodayEth} USDT, за неделю: ${input.spentWeekEth} USDT.

Рынок (цены в USD): ${pricesLine}. Тренд: ${input.marketTrend}.
        
Действия: buy_coin (купить криптоактив за USDT — только ETH, BTC, SOL и т.д., не USDT), sell_coin (продать), transfer (перевод), hold (ничего не делать).
При buy_coin обязательно укажи: amountEth, asset (тикер крипты: ETH, BTC, SOL… не USDT), reason, priceReason, plans, и горизонт (ИНВЕСТОР: termDays>=10; ТРЕЙДЕР: termMinutes 5–30).
При sell_coin обязательно укажи: asset, reason, priceReason, plans (почему закрываешь позицию и что дальше).
При hold всегда пиши развёрнутое обоснование (reason): почему не покупаешь, что ждёшь, какие уровни или условия важны.

Все текстовые поля (reason, priceReason, plans) пиши ТОЛЬКО на чистом русском языке, без английских слов, без других алфавитов, без эмодзи и спецсимволов. Коротко и понятно, 1–2 предложения.
        
Ответь только одним JSON-объектом, без markdown. Примеры:
{"action":"hold","reason":"Ожидаю коррекции к поддержке $95k по BTC; текущая перекупленность, не добавляю в лонг до отката."}
{"action":"buy_coin","amountEth":20,"asset":"BTC","reason":"Диверсификация на коррекции","priceReason":"Цена откатила от ATH, покупаю на поддержке","termDays":30,"plans":"Перепродажа через месяц при росте на 5-10%"}
{"action":"buy_coin","amountEth":10,"asset":"ETH","reason":"Рост по тренду","priceReason":"Сильная поддержка на текущих уровнях","termDays":14,"plans":"Держать до целевой $4000 или перепродажа через 2 недели"}
{"action":"buy_coin","amountEth":20,"asset":"SOL","reason":"Импульс и пробой уровня","priceReason":"Пробой локального сопротивления на объёме","termMinutes":15,"plans":"Фиксация по +0.8% или выход по стопу при откате"}
{"action":"sell_coin","asset":"SOL","reason":"Цель достигнута, фиксирую прибыль","priceReason":"Цена подошла к локальному сопротивлению","termMinutes":10,"plans":"Перевожу в USDT и жду ретест"}
Допустимые action: buy_coin, sell_coin, transfer, hold.`;
};

/** Достаёт JSON из текста (убирает обёртки ```json ... ```) и валидирует через schema. */
function parseDecisionJson(text: string): AgentTradeDecision | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, trimmed];
  const raw = (jsonMatch[1] ?? trimmed).trim();
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = decisionSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export async function getAgentTradeDecision(
  input: AgentTraderInput
): Promise<AgentTradeResult> {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!groqKey && !openaiKey) {
    return {
      decision: null,
      error: 'Добавьте GROQ_API_KEY или OPENAI_API_KEY в .env.local. Groq бесплатен и часто доступен без ограничений по региону: console.groq.com',
    };
  }

  const prompt = AGENT_PROMPT(input);

  if (groqKey) {
    const groqProvider = getGroqProvider();
    if (!groqProvider) {
      return { decision: null, error: 'GROQ_API_KEY не задан или пустой.' };
    }
    const groqModels = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'] as const;
    let lastError = '';
    for (const modelId of groqModels) {
      try {
        const { text } = await generateText({
          model: groqProvider.chat(modelId),
          prompt,
        });
        const decision = parseDecisionJson(text);
        if (decision) return { decision };
        lastError = 'Модель вернула невалидный JSON. Попробуйте ещё раз.';
      } catch (e) {
        logger.error(`getAgentTradeDecision (Groq ${modelId})`, e);
        const err = e as { message?: string; cause?: { message?: string } };
        const raw = (err?.message ?? err?.cause?.message ?? '').trim();
        lastError = raw ? (raw.length > 200 ? raw.slice(0, 200) + '…' : raw) : 'Неверный или истёкший ключ. Зайдите на console.groq.com → API Keys, создайте ключ и вставьте в .env.local: GROQ_API_KEY=gsk_...';
      }
    }
    // Если Groq не справился, но есть OpenAI-ключ, пробуем OpenAI как резерв.
    if (!openaiKey) {
      return { decision: null, error: `Groq: ${lastError}` };
    }
    // Иначе просто продолжаем ниже к OpenAI-блоку.
  }

  if (!openaiKey) {
    return {
      decision: null,
      error: 'Не задан ни GROQ_API_KEY, ни OPENAI_API_KEY. Добавьте один из них в .env.local.',
    };
  }

  try {
    const { object } = await generateObject({
      model: openai('gpt-4o-mini'),
      schema: decisionSchema,
      prompt,
    });

    return { decision: object };
  } catch (e) {
    logger.error('getAgentTradeDecision', e);
    const err = e as { message?: string; status?: number; cause?: { message?: string } };
    const original =
      (err?.message ?? err?.cause?.message ?? 'Не удалось получить решение ИИ.').trim();
    const short =
      original.length > 160 ? original.slice(0, 157).trimEnd() + '…' : original;
    return { decision: null, error: short };
  }
}

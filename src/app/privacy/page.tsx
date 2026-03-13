type Lang = 'ru' | 'en';

function getLang(searchParams?: { lang?: string }): Lang {
  const raw = searchParams?.lang?.toLowerCase();
  return raw === 'en' ? 'en' : 'ru';
}

const copy = {
  ru: {
    title: 'Политика конфиденциальности и отказ от ответственности',
    intro:
      'Платформа предназначена для управления AI-агентами: демо-режим с виртуальным балансом и режим реального кошелька с автоматической торговлей. Решения агентов принимаются автоматически на основе настроек пользователя, лимитов политики и данных рынка. Ниже описано, какие данные мы обрабатываем и как.',
    sections: [
      {
        title: '1. Какие данные мы обрабатываем',
        paragraphs: [
          'Учётная запись: email, имя, изображение профиля (при входе через OAuth), хэш пароля; идентификатор Telegram при привязке бота для уведомлений.',
          'Агенты и политики: названия агентов, тип (инвестор/трейдер), лимиты (дневной, за транзакцию, макс. позиция), разрешённые операции, настройки режима 24/7 и реальной торговли (адрес кошелька, сеть, лимиты, адрес получателя средств).',
          'Кошельки: адреса EVM-кошельков, привязка к агентам; при импорте кошелька с серверным ключом — зашифрованное хранение приватного ключа на сервере для выполнения сделок по расписанию. Ключи шифруются и не передаются третьим лицам.',
          'Транзакции: в демо-режиме — история решений агента (покупка/продажа, сумма, актив, причина, срок); в режиме реального кошелька — хэши транзакций, актив, сумма в USD, комиссия, причина и срок покупки, дата. Эти данные используются для отчётов, аналитики и отображения в разделе «Транзакции».',
          'Технические данные: сессии, токены OAuth (Google), при необходимости — ключи API (например, OpenAI/Groq для ИИ-решений), только если вы их указываете. Мы не используем ваши API-ключи за пределами запросов к ИИ в рамках работы агентов.',
        ],
      },
      {
        title: '2. Для чего используются данные',
        paragraphs: [
          'Обеспечение работы сервиса: аутентификация, хранение настроек агентов и политик, привязка кошельков, выполнение демо- и реальных сделок в рамках лимитов.',
          'Автоматические решения агентов: передача в провайдеров ИИ (Groq или OpenAI) контекста (баланс, лимиты, цены, тренд, примерная комиссия) для генерации решений buy_coin/sell_coin/hold; передача цен с CoinGecko для расчётов.',
          'Реальная торговля: при включённом режиме реального кошелька — отправка транзакций в сеть (Ethereum mainnet, Base и т.д.) от вашего имени с использованием привязанного кошелька; при использовании CDP Coinbase — вызов API CDP для создания кошельков и подписания транзакций.',
          'Уведомления: отправка отчётов и алертов в Telegram при настройке бота и привязке чата.',
          'Аналитика и биллинг: агрегированная статистика по агентам, балансам и транзакциям для личного кабинета и, при необходимости, для тарифов и продлений.',
        ],
      },
      {
        title: '3. Передача данных третьим лицам',
        paragraphs: [
          'Данные передаются только в объёме, необходимом для работы функций: провайдеры ИИ (Groq, OpenAI) — для принятия решений агентами; Telegram — для доставки уведомлений; Coinbase CDP — при использовании кошельков CDP; CoinGecko — запросы цен (без персональных данных); хостинг и база данных (например, Vercel, PostgreSQL) — размещение приложения и хранение данных.',
          'Мы не продаём и не передаём ваши персональные данные в рекламные или маркетинговые цели. Приватные ключи кошельков не передаются никому и хранятся в зашифрованном виде.',
        ],
      },
      {
        title: '4. Безопасность и хранение',
        paragraphs: [
          'Пароли хранятся в виде хэшей; ключи шифруются с использованием секрета (WALLET_ENCRYPTION_KEY или NEXTAUTH_SECRET). Рекомендуется задать отдельный длинный ключ шифрования для продакшена.',
          'Вы несёте ответственность за сохранность своих учётных данных и API-ключей. При компрометации ключа отзовите его у провайдера и смените в настройках.',
        ],
      },
      {
        title: '5. Отказ от ответственности',
        paragraphs: [
          'Платформа и её разработчики не несут ответственности за любые финансовые решения и действия, совершённые на основе решений агентов, а также за прямые или косвенные убытки, включая потери при реальной торговле криптовалютой.',
          'Сервис не является финансовой или инвестиционной рекомендацией и не призывает к покупке или продаже активов. Использование агентов, в том числе в режиме реального кошелька с автоматическими сделками (включая DEX-свопы), осуществляется на свой страх и риск.',
          'Демо-режим (виртуальный баланс) не гарантирует аналогичных результатов на реальном рынке. Реальная торговля связана с рисками ликвидности, комиссий, проскальзывания и работы смарт-контрактов.',
        ],
      },
      {
        title: '6. Использование сервиса',
        paragraphs: [
          'Регистрируясь и используя платформу, вы подтверждаете, что понимаете риски автоматизации финансовых операций и торговли криптовалютой и принимаете условия обработки данных, изложенные в этой политике.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy and Disclaimer',
    intro:
      'The platform is used to manage AI agents: demo mode with virtual balance and real-wallet mode with automated trading. Agent decisions are made automatically based on user settings, policy limits, and market data. Below we describe what data we process and how.',
    sections: [
      {
        title: '1. Data we process',
        paragraphs: [
          'Account: email, name, profile image (when using OAuth), password hash; Telegram ID when linking the bot for notifications.',
          'Agents and policies: agent names, type (investor/trader), limits (daily, per transaction, max position), allowed operations, 24/7 and real-trading settings (wallet address, network, limits, recipient address).',
          'Wallets: EVM wallet addresses linked to agents; when importing a wallet with a server key, the private key is stored encrypted on the server for scheduled execution of trades. Keys are encrypted and not shared with third parties.',
          'Transactions: in demo mode — history of agent decisions (buy/sell, amount, asset, reason, term); in real-wallet mode — transaction hashes, asset, amount in USD, fee, reason and purchase term, date. This data is used for reports, analytics, and the Transactions section.',
          'Technical data: sessions, OAuth tokens (Google), and optionally API keys (e.g. OpenAI/Groq for AI decisions) if you provide them. We do not use your API keys outside of AI requests for agent decisions.',
        ],
      },
      {
        title: '2. How we use the data',
        paragraphs: [
          'Service operation: authentication, storing agent and policy settings, linking wallets, executing demo and real trades within limits.',
          'Automated agent decisions: sending context (balance, limits, prices, trend, estimated fee) to AI providers (Groq or OpenAI) for buy_coin/sell_coin/hold decisions; fetching prices from CoinGecko for calculations.',
          'Real trading: when real-wallet mode is enabled — sending transactions to the network (Ethereum mainnet, Base, etc.) on your behalf using the linked wallet; when using Coinbase CDP — calling CDP API for wallet creation and transaction signing.',
          'Notifications: sending reports and alerts to Telegram when the bot and chat are linked.',
          'Analytics and billing: aggregated statistics on agents, balances, and transactions for the dashboard and, where applicable, for plans and renewals.',
        ],
      },
      {
        title: '3. Sharing data with third parties',
        paragraphs: [
          'Data is shared only as necessary for features: AI providers (Groq, OpenAI) for agent decisions; Telegram for notifications; Coinbase CDP when using CDP wallets; CoinGecko for price requests (no personal data); hosting and database (e.g. Vercel, PostgreSQL) for running the app and storing data.',
          'We do not sell or share your personal data for advertising or marketing. Wallet private keys are not shared with anyone and are stored encrypted.',
        ],
      },
      {
        title: '4. Security and retention',
        paragraphs: [
          'Passwords are stored as hashes; keys are encrypted using a secret (WALLET_ENCRYPTION_KEY or NEXTAUTH_SECRET). Using a separate long encryption key in production is recommended.',
          'You are responsible for keeping your credentials and API keys secure. If a key is compromised, revoke it with the provider and update it in settings.',
        ],
      },
      {
        title: '5. Disclaimer',
        paragraphs: [
          'The platform and its developers are not liable for any financial decisions or actions taken based on agent decisions, or for any direct or indirect losses, including from real cryptocurrency trading.',
          'The service does not constitute financial or investment advice and does not solicit the purchase or sale of any assets. Use of agents, including real-wallet mode with automated trades (including DEX swaps), is at your own risk.',
          'Demo mode (virtual balance) does not guarantee similar results on real markets. Real trading involves risks of liquidity, fees, slippage, and smart contract operation.',
        ],
      },
      {
        title: '6. Use of the service',
        paragraphs: [
          'By registering and using the platform, you confirm that you understand the risks of automated financial operations and cryptocurrency trading and accept the data processing terms set out in this policy.',
        ],
      },
    ],
  },
} satisfies Record<Lang, { title: string; intro: string; sections: { title: string; paragraphs: string[] }[] }>;

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const lang = getLang(params);
  const t = copy[lang] ?? copy.ru;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl space-y-6 text-zinc-900 dark:text-zinc-50">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t.intro}</p>
        {t.sections.map((section) => (
          <section
            key={section.title}
            className="space-y-3 text-sm text-zinc-700 dark:text-zinc-300"
          >
            <h2 className="font-semibold">{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}


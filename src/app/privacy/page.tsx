type Lang = 'ru' | 'en';

function getLang(searchParams?: { lang?: string }): Lang {
  const raw = searchParams?.lang?.toLowerCase();
  return raw === 'en' ? 'en' : 'ru';
}

const copy = {
  ru: {
    title: 'Политика конфиденциальности и отказ от ответственности',
    intro:
      'Этот сайт предназначен для тестирования и демонстрации работы AI-агентов. Все решения агентов принимаются автоматически на основе настроек пользователя и данных рынка.',
    sections: [
      {
        title: '1. Конфиденциальность',
        paragraphs: [
          'Мы не передаём ваши персональные данные третьим лицам, за исключением случаев, когда это требуется для работы интеграций (например, OpenAI, Telegram) и только в объёме, необходимом для работы сервиса.',
          'Вы несёте ответственность за конфиденциальность своих ключей и учетных данных (API-ключи, пароли и т.д.).',
        ],
      },
      {
        title: '2. Отказ от ответственности',
        paragraphs: [
          'Платформа и её разработчики не несут ответственности за любые финансовые решения и действия, совершённые на основе рекомендаций или действий агентов, а также за возможные убытки, прямые или косвенные.',
          'Сервис не является финансовой рекомендацией, инвестиционной консультацией или призывом к покупке/продаже каких-либо активов. Используйте агентов и их решения на свой страх и риск.',
          'При использовании демо-режима (виртуальный баланс) результаты торгов не гарантируют аналогичные результаты на реальном рынке.',
        ],
      },
      {
        title: '3. Использование сервиса',
        paragraphs: [
          'Регистрируясь и используя сервис, вы подтверждаете, что понимаете риски, связанные с торговлей криптовалютой и автоматизацией финансовых операций, и принимаете их.',
        ],
      },
    ],
  },
  en: {
    title: 'Privacy Policy and Disclaimer',
    intro:
      'This website is intended for testing and demonstrating AI agents. All agent decisions are made automatically based on user settings and market data.',
    sections: [
      {
        title: '1. Privacy',
        paragraphs: [
          'We do not share your personal data with third parties except when required to run integrations (for example, OpenAI, Telegram) and only to the extent necessary for the service to operate.',
          'You are responsible for keeping your keys and credentials (API keys, passwords, etc.) confidential.',
        ],
      },
      {
        title: '2. Disclaimer',
        paragraphs: [
          'The platform and its developers are not responsible for any financial decisions and actions made based on agent recommendations or actions, nor for any direct or indirect losses.',
          'The service does not constitute financial advice, investment advice or a solicitation to buy or sell any assets. Use agents and their decisions at your own risk.',
          'When using demo mode (virtual balance), trading results do not guarantee similar results on real markets.',
        ],
      },
      {
        title: '3. Use of the service',
        paragraphs: [
          'By registering and using the service, you confirm that you understand and accept the risks associated with cryptocurrency trading and automation of financial operations.',
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


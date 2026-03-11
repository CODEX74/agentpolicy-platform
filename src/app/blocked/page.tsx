import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Lang = 'ru' | 'en';

function getLang(searchParams?: { lang?: string }): Lang {
  const raw = searchParams?.lang?.toLowerCase();
  return raw === 'en' ? 'en' : 'ru';
}

const copy: Record<
  Lang,
  {
    title: string;
    p1: string;
    p2: string;
    hint: string;
    button: string;
    footer: string;
  }
> = {
  ru: {
    title: 'Доступ к платформе ограничен',
    p1: 'Сейчас платформа недоступна для пользователей из России и Беларуси.',
    p2: 'Чтобы продолжить пользоваться сайтом, установите VPN и выберите любую другую страну (например, Польшу, Германию, Нидерланды и т.д.), затем обновите страницу.',
    hint: 'Рекомендуем установить VPN-расширение для браузера Chrome:',
    button: 'Открыть каталог VPN-расширений',
    footer: 'После установки и включения VPN вернитесь на эту страницу и попробуйте снова.',
  },
  en: {
    title: 'Access to the platform is restricted',
    p1: 'The platform is currently unavailable for users from Russia and Belarus.',
    p2: 'To continue using the site, install a VPN and choose any other country (for example Poland, Germany, the Netherlands, etc.), then refresh the page.',
    hint: 'We recommend installing a VPN extension for the Chrome browser:',
    button: 'Open VPN extensions catalog',
    footer: 'After installing and enabling the VPN, return to this page and try again.',
  },
};

export default async function BlockedPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const lang = getLang(params);
  const t = copy[lang] ?? copy.ru;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-50">
      <div className="w-full max-w-xl space-y-6 text-center">
        <h1 className="text-3xl font-semibold md:text-4xl">{t.title}</h1>
        <p className="text-slate-300">{t.p1}</p>
        <p className="text-slate-300">{t.p2}</p>
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{t.hint}</p>
          <Link
            href="https://chromewebstore.google.com/search/VPN?hl=ru&utm_source=ext_sidebar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition-colors hover:bg-emerald-400"
          >
            {t.button}
          </Link>
        </div>
        <p className="text-xs text-slate-500">{t.footer}</p>
      </div>
    </main>
  );
}


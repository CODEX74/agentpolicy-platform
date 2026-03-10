import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function BlockedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-50 px-4">
      <div className="max-w-xl w-full space-y-6 text-center">
        <h1 className="text-3xl md:text-4xl font-semibold">
          Доступ к платформе ограничен
        </h1>
        <p className="text-slate-300">
          Сейчас платформа недоступна для пользователей из России и Беларуси.
        </p>
        <p className="text-slate-300">
          Чтобы продолжить пользоваться сайтом, установите VPN и выберите любую другую страну
          (например, Польшу, Германию, Нидерланды и т.д.), затем обновите страницу.
        </p>
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Рекомендуем установить VPN-расширение для браузера Chrome:
          </p>
          <Link
            href="https://chromewebstore.google.com/search/VPN?hl=ru&utm_source=ext_sidebar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            Открыть каталог VPN-расширений
          </Link>
        </div>
        <p className="text-xs text-slate-500">
          После установки и включения VPN вернитесь на эту страницу и попробуйте снова.
        </p>
      </div>
    </main>
  );
}


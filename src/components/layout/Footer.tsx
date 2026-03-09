import Link from 'next/link';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'AgentPolicy';

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">{appName}</p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Управление финансами AI-агентов
            </p>
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">Продукт</p>
            <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/how-it-works" className="hover:underline">Как это работает</Link></li>
              <li><Link href="/pricing" className="hover:underline">Тарифы</Link></li>
              <li><Link href="/dashboard" className="hover:underline">Дашборд</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">Ресурсы</p>
            <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/blog" className="hover:underline">Блог</Link></li>
              <li><Link href="/support" className="hover:underline">Поддержка</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">Контакты</p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              support@agentpolicy.com
            </p>
          </div>
        </div>
        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          © {new Date().getFullYear()} {appName}. Все права защищены.
        </p>
      </div>
    </footer>
  );
}

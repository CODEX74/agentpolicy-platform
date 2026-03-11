'use client';

import Link from 'next/link';
import { useLang, withLang } from '@/contexts/LanguageContext';

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? 'AgentWallet';

const t = {
  ru: {
    tagline: 'Управление финансами AI-агентов',
    product: 'Продукт',
    howItWorks: 'Как это работает',
    pricing: 'Тарифы',
    dashboard: 'Дашборд',
    resources: 'Ресурсы',
    blog: 'Блог',
    support: 'Поддержка',
    contacts: 'Контакты',
    rights: 'Все права защищены.',
    disclaimer: 'Сайт и разработчики не несут ответственности за решения и действия агентов. Не является финансовой рекомендацией.',
    privacy: 'Политика конфиденциальности и отказ от ответственности',
  },
  en: {
    tagline: 'AI agent finance management',
    product: 'Product',
    howItWorks: 'How it works',
    pricing: 'Pricing',
    dashboard: 'Dashboard',
    resources: 'Resources',
    blog: 'Blog',
    support: 'Support',
    contacts: 'Contacts',
    rights: 'All rights reserved.',
    disclaimer: 'The site and developers are not responsible for agent decisions and actions. Not financial advice.',
    privacy: 'Privacy policy and disclaimer',
  },
};

export function Footer() {
  const lang = useLang();
  const text = t[lang];

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">{appName}</p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {text.tagline}
            </p>
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{text.product}</p>
            <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href={withLang('/how-it-works', lang)} className="hover:underline">{text.howItWorks}</Link></li>
              <li><Link href={withLang('/pricing', lang)} className="hover:underline">{text.pricing}</Link></li>
              <li><Link href={withLang('/dashboard', lang)} className="hover:underline">{text.dashboard}</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{text.resources}</p>
            <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href={withLang('/blog', lang)} className="hover:underline">{text.blog}</Link></li>
              <li><Link href={withLang('/support', lang)} className="hover:underline">{text.support}</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-50">{text.contacts}</p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              support@AgentWallet.com
            </p>
          </div>
        </div>
        <div className="mt-8 space-y-2 text-center text-sm text-zinc-500 dark:text-zinc-400">
          <p>
            © {new Date().getFullYear()} {appName}. {text.rights}
          </p>
          <p>
            {text.disclaimer}
          </p>
          <p>
            <Link href={withLang('/privacy', lang)} className="underline hover:text-zinc-700 dark:hover:text-zinc-200">
              {text.privacy}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}

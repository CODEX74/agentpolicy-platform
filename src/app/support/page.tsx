import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

type Lang = 'ru' | 'en';

function getLang(searchParams?: { lang?: string }): Lang {
  const raw = searchParams?.lang?.toLowerCase();
  return raw === 'en' ? 'en' : 'ru';
}

const copy: Record<Lang, { title: string; text: string }> = {
  ru: {
    title: 'Поддержка и FAQ',
    text: 'Свяжитесь с нами: support@agentpolicy.com',
  },
  en: {
    title: 'Support & FAQ',
    text: 'Contact us: support@agentpolicy.com',
  },
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const lang = getLang(params);
  const t = copy[lang] ?? copy.ru;

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="container flex-1 py-12">
        <h1 className="text-2xl font-bold">{t.title}</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">{t.text}</p>
      </main>
      <Footer />
    </div>
  );
}

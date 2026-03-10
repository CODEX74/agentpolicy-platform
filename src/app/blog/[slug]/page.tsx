import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

type Lang = 'ru' | 'en';

function getLang(searchParams?: { lang?: string }): Lang {
  const raw = searchParams?.lang?.toLowerCase();
  return raw === 'en' ? 'en' : 'ru';
}

const copy: Record<Lang, { prefix: string; text: string }> = {
  ru: {
    prefix: 'Статья',
    text: 'Контент статьи.',
  },
  en: {
    prefix: 'Post',
    text: 'Post content.',
  },
};

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: { lang?: string };
}) {
  const { slug } = await params;
  if (!slug) notFound();

  const lang = getLang(searchParams);
  const t = copy[lang] ?? copy.ru;

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="container flex-1 py-12">
        <h1 className="text-2xl font-bold">
          {t.prefix}: {slug}
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">{t.text}</p>
      </main>
      <Footer />
    </div>
  );
}

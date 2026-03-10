import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="container flex-1 py-12">
        <h1 className="text-2xl font-bold">Статья: {slug}</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">Контент статьи.</p>
      </main>
      <Footer />
    </div>
  );
}

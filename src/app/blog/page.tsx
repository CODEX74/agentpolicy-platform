import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="container flex-1 py-12">
        <h1 className="text-2xl font-bold">Блог</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Скоро здесь появятся статьи.
        </p>
      </main>
      <Footer />
    </div>
  );
}

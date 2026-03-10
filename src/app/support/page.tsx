import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function SupportPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="container flex-1 py-12">
        <h1 className="text-2xl font-bold">Поддержка и FAQ</h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Свяжитесь с нами: support@agentpolicy.com
        </p>
      </main>
      <Footer />
    </div>
  );
}

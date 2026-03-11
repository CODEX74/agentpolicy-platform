import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Pricing } from '@/components/landing/Pricing';

type Lang = 'ru' | 'en';

function getLang(searchParams?: { lang?: string }): Lang {
  const raw = searchParams?.lang?.toLowerCase();
  return raw === 'en' ? 'en' : 'ru';
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  getLang(params);

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="flex-1 py-12">
        <Suspense fallback={null}>
          <Pricing />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

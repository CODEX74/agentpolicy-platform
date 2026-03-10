import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HowItWorks } from '@/components/landing/HowItWorks';

type Lang = 'ru' | 'en';

function getLang(searchParams?: { lang?: string }): Lang {
  const raw = searchParams?.lang?.toLowerCase();
  return raw === 'en' ? 'en' : 'ru';
}

export default function HowItWorksPage({ searchParams }: { searchParams?: { lang?: string } }) {
  const lang = getLang(searchParams);

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="flex-1 py-12">
        <HowItWorks lang={lang} />
      </main>
      <Footer />
    </div>
  );
}

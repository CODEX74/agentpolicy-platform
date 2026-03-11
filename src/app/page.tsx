import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Pricing } from '@/components/landing/Pricing';
import { CTA } from '@/components/landing/CTA';

type Lang = 'ru' | 'en';

function getLang(searchParams?: { lang?: string }): Lang {
  const raw = searchParams?.lang?.toLowerCase();
  return raw === 'en' ? 'en' : 'ru';
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  // Пока язык для SEO/метатегов не используем, но оставляем хелпер для будущего
  const params = searchParams ? await searchParams : undefined;
  getLang(params);

  return (
    <div className="flex min-h-screen flex-col">
      <Suspense fallback={null}>
        <Header />
      </Suspense>
      <main className="flex-1">
        <Suspense fallback={null}>
          <Hero />
          <Features />
          <HowItWorks />
          <Pricing />
          <CTA />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

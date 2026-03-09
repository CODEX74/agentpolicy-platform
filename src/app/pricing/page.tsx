import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Pricing } from '@/components/landing/Pricing';

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12">
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}

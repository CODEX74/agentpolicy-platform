import { Button } from '@/components/ui/Button';

type Lang = 'ru' | 'en';

const ctaText: Record<Lang, { title: string; subtitle: string; cta: string }> = {
  ru: {
    title: 'Готовы запустить первого агента?',
    subtitle: 'Зарегистрируйтесь, укажите OpenAI API key, создайте агента и посмотрите, как он торгует на демо‑балансе.',
    cta: 'Перейти в дашборд',
  },
  en: {
    title: 'Ready to launch your first agent?',
    subtitle:
      'Sign up, add your OpenAI API key, create an agent and see how it trades on a demo balance.',
    cta: 'Open dashboard',
  },
};

export function CTA({ lang }: { lang: Lang }) {
  const t = ctaText[lang] ?? ctaText.ru;

  return (
    <section className="py-20 sm:py-24">
      <div className="container px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-zinc-900 px-6 py-12 text-center sm:px-10 sm:py-16 dark:bg-zinc-800">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{t.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-zinc-300 sm:text-base">
            {t.subtitle}
          </p>
          <div className="mt-8">
            <Button
              href="/dashboard"
              size="lg"
              className="bg-white text-zinc-900 hover:bg-zinc-100"
            >
              {t.cta}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

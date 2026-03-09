import { Button } from '@/components/ui/Button';

export function CTA() {
  return (
    <section className="py-24">
      <div className="container">
        <div className="rounded-2xl bg-zinc-900 px-6 py-16 text-center dark:bg-zinc-800">
          <h2 className="text-3xl font-bold text-white">
            Готовы начать?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-300">
            Подключите первого агента и настройте политики за несколько минут.
          </p>
          <div className="mt-8">
            <Button href="/dashboard" size="lg" className="bg-white text-zinc-900 hover:bg-zinc-100">
              Перейти в дашборд
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

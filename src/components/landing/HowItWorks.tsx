const steps = [
  { step: 1, title: 'Подключите агента', text: 'Создайте агента в системе или импортируйте из Moltbook.' },
  { step: 2, title: 'Создайте кошелёк', text: 'Кошелёк создаётся через CDP и привязывается к агенту.' },
  { step: 3, title: 'Настройте политику', text: 'Лимиты, разрешённые операции, время и уведомления.' },
  { step: 4, title: 'Контролируйте', text: 'Все транзакции проходят валидацию и отображаются в дашборде.' },
];

export function HowItWorks() {
  return (
    <section className="py-24">
      <div className="container">
        <h2 className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          Как это работает
        </h2>
        <div className="mx-auto mt-16 max-w-3xl space-y-8">
          {steps.map((s) => (
            <div key={s.step} className="flex gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-zinc-50 dark:text-zinc-900">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{s.title}</h3>
                <p className="mt-1 text-zinc-600 dark:text-zinc-400">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

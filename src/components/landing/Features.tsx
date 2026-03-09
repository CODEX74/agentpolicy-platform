import { Shield, Wallet, Bell, Sliders } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

const features = [
  { title: 'Политики и лимиты', description: 'Дневные и недельные лимиты, максимум на транзакцию, белые и чёрные списки адресов.', icon: Sliders },
  { title: 'Кошельки CDP', description: 'Создание и управление кошельками агентов через Coinbase Developer Platform.', icon: Wallet },
  { title: 'Безопасность', description: 'Валидация каждой транзакции по вашим правилам перед исполнением.', icon: Shield },
  { title: 'Уведомления', description: 'Email и Telegram при транзакциях и при превышении лимитов.', icon: Bell },
];

export function Features() {
  return (
    <section className="py-24 dark:bg-zinc-900/50">
      <div className="container">
        <h2 className="text-center text-3xl font-bold text-zinc-900 dark:text-zinc-50">Возможности платформы</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-600 dark:text-zinc-400">
          Визуальный конструктор политик, интеграция с Moltbook и полный контроль над расходами агентов.
        </p>
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title}>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                    <Icon className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">{f.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

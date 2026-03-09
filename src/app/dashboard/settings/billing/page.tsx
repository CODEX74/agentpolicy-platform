import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PRICING_PLANS } from '@/lib/constants/pricing';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect('/');

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold">Оплата и подписка</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-2xl font-bold">${plan.price}/мес</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}

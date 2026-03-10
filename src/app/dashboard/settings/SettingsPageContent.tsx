'use client';

import { useLang } from '@/contexts/LanguageContext';
import { SettingsForm } from '@/components/dashboard/SettingsForm';

const t = { ru: { title: 'Настройки' }, en: { title: 'Settings' } };

export function SettingsPageContent({
  email,
  initialName,
  initialPlan,
  canChangePlan,
  initialTelegramId,
}: {
  email: string;
  initialName: string;
  initialPlan: string;
  canChangePlan: boolean;
  initialTelegramId: string;
}) {
  const lang = useLang();
  return (
    <>
      <h1 className="text-2xl font-bold">{t[lang].title}</h1>
      <div className="mt-6">
        <SettingsForm
          email={email}
          initialName={initialName}
          initialPlan={initialPlan}
          canChangePlan={canChangePlan}
          initialTelegramId={initialTelegramId}
        />
      </div>
    </>
  );
}

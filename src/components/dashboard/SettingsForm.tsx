'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PRICING_PLANS } from '@/lib/constants/pricing';

interface SettingsFormProps {
  email: string;
  initialName: string;
  initialPlan: string;
  canChangePlan: boolean;
  initialTelegramId: string;
}

export function SettingsForm({
  email,
  initialName,
  initialPlan,
  canChangePlan,
  initialTelegramId,
}: SettingsFormProps) {
  const [name, setName] = useState(initialName);
  const [plan, setPlan] = useState(initialPlan);
  const [telegramId, setTelegramId] = useState(initialTelegramId);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiLoading, setOpenaiLoading] = useState(false);
  const [openaiMessage, setOpenaiMessage] = useState<string | null>(null);
  const [openaiError, setOpenaiError] = useState<string | null>(null);
  const [openaiHasKey, setOpenaiHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/openai-key')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setOpenaiHasKey(Boolean(data?.hasKey));
      })
      .catch(() => setOpenaiHasKey(false));
    return () => {
      cancelled = true;
    };
  }, []);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [emailChangeNew, setEmailChangeNew] = useState('');
  const [emailChangeCode, setEmailChangeCode] = useState('');
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState<string | null>(null);
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    setProfileError(null);
    setProfileMessage(null);
    setProfileLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfileError(typeof data?.error === 'string' ? data.error : 'Не удалось сохранить');
        return;
      }
      setProfileMessage('Имя сохранено');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Пароль не менее 6 символов');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasswordError(typeof data?.error === 'string' ? data.error : 'Не удалось сменить пароль');
        return;
      }
      setPasswordMessage('Пароль изменён');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSavePlan = async () => {
    setPlanError(null);
    setPlanMessage(null);
    setPlanLoading(true);
    try {
      const res = await fetch('/api/user/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPlanError(typeof data?.error === 'string' ? data.error : 'Не удалось сменить тариф');
        return;
      }
      setPlanMessage('Тариф обновлён');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleSaveTelegram = async () => {
    setTelegramError(null);
    setTelegramMessage(null);
    setTelegramLoading(true);
    try {
      const res = await fetch('/api/user/telegram', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramId: telegramId.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTelegramError(typeof data?.error === 'string' ? data.error : 'Не удалось сохранить');
        return;
      }
      setTelegramMessage('Telegram привязан');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleSaveOpenAiKey = async () => {
    setOpenaiError(null);
    setOpenaiMessage(null);
    setOpenaiLoading(true);
    try {
      const res = await fetch('/api/user/openai-key', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiApiKey: openaiKey.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setOpenaiError(typeof data?.error === 'string' ? data.error : 'Не удалось сохранить');
        return;
      }
      setOpenaiMessage('API key сохранён');
      setOpenaiHasKey(true);
      // очищаем поле после сохранения (ключ не отображаем)
      setOpenaiKey('');
    } finally {
      setOpenaiLoading(false);
    }
  };

  const handleRequestEmailChange = async () => {
    setEmailChangeError(null);
    setEmailChangeMessage(null);
    if (!emailChangeNew.trim()) {
      setEmailChangeError('Введите новый email');
      return;
    }
    setEmailChangeLoading(true);
    try {
      const res = await fetch('/api/user/email-change/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: emailChangeNew.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailChangeError(
          typeof data?.error === 'string'
            ? data.error
            : 'Не удалось отправить код подтверждения'
        );
        return;
      }
      setEmailChangeMessage(
        'Код подтверждения отправлен на новый email. Введите его ниже, чтобы завершить смену.'
      );
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    setEmailChangeError(null);
    setEmailChangeMessage(null);
    if (!emailChangeNew.trim() || !emailChangeCode.trim()) {
      setEmailChangeError('Введите новый email и код подтверждения');
      return;
    }
    setEmailChangeLoading(true);
    try {
      const res = await fetch('/api/user/email-change/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newEmail: emailChangeNew.trim(),
          code: emailChangeCode.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailChangeError(
          typeof data?.error === 'string'
            ? data.error
            : 'Не удалось подтвердить смену email'
        );
        return;
      }
      setEmailChangeMessage(
        (data?.message as string) ||
          'Email изменён. Войдите заново, используя новый адрес.'
      );
    } finally {
      setEmailChangeLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">OpenAI (ChatGPT)</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Для работы агента вам нужно указать свой <strong>OpenAI API key</strong>. Ключ хранится в вашем аккаунте.
          </p>
          {openaiHasKey === true && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              Ключ уже сохранён. Если хотите заменить — вставьте новый и нажмите «Сохранить».
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              OpenAI API key
            </label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                disabled={openaiLoading}
                className="max-w-xs"
                autoComplete="off"
              />
              <Button
                type="button"
                size="sm"
                disabled={openaiLoading || openaiKey.trim().length < 10}
                onClick={handleSaveOpenAiKey}
              >
                Сохранить
              </Button>
            </div>
            {openaiMessage && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{openaiMessage}</p>}
            {openaiError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{openaiError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Профиль</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Имя
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
                disabled={profileLoading}
                className="max-w-xs"
              />
              <Button
                type="button"
                size="sm"
                disabled={profileLoading || !name.trim()}
                onClick={handleSaveProfile}
              >
                Сохранить
              </Button>
            </div>
            {profileMessage && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{profileMessage}</p>}
            {profileError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{profileError}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{email}</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
              Текущий email. Ниже вы можете запросить смену адреса по коду подтверждения.
            </p>
            <div className="mt-3 space-y-2">
              <Input
                type="email"
                value={emailChangeNew}
                onChange={(e) => setEmailChangeNew(e.target.value)}
                placeholder="Новый email"
                disabled={emailChangeLoading}
                className="max-w-xs"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={emailChangeLoading || !emailChangeNew.trim()}
                  onClick={handleRequestEmailChange}
                >
                  Отправить код
                </Button>
                <Input
                  type="text"
                  value={emailChangeCode}
                  onChange={(e) => setEmailChangeCode(e.target.value)}
                  placeholder="Код из письма"
                  disabled={emailChangeLoading}
                  className="max-w-[140px]"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    emailChangeLoading ||
                    !emailChangeNew.trim() ||
                    !emailChangeCode.trim()
                  }
                  onClick={handleConfirmEmailChange}
                >
                  Подтвердить email
                </Button>
              </div>
              {emailChangeMessage && (
                <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                  {emailChangeMessage}
                </p>
              )}
              {emailChangeError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {emailChangeError}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Пароль</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Текущий пароль
            </label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              disabled={passwordLoading}
              className="max-w-xs"
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Новый пароль
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="не менее 6 символов"
              disabled={passwordLoading}
              className="max-w-xs"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Подтвердите новый пароль
            </label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={passwordLoading}
              className="max-w-xs"
              autoComplete="new-password"
            />
          </div>
          <Button
            type="button"
            size="sm"
            disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
            onClick={handleChangePassword}
          >
            Сменить пароль
          </Button>
          {passwordMessage && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{passwordMessage}</p>}
          {passwordError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Telegram</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Чтобы бот отправлял вам сообщения и отвечал на команды, привяжите ваш Telegram chat id.
            Напишите боту <strong>/start</strong> — он покажет ваш <strong>chat id</strong>.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Telegram chat id
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder="например: 123456789"
                disabled={telegramLoading}
                className="max-w-xs"
              />
              <Button
                type="button"
                size="sm"
                disabled={telegramLoading || !telegramId.trim()}
                onClick={handleSaveTelegram}
              >
                Сохранить
              </Button>
            </div>
            {telegramMessage && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{telegramMessage}</p>}
            {telegramError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{telegramError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Тарифный план</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {canChangePlan ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  disabled={planLoading}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                >
                  {PRICING_PLANS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — ${p.price}/мес
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  disabled={planLoading}
                  onClick={handleSavePlan}
                >
                  Сохранить тариф
                </Button>
              </div>
              {planMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{planMessage}</p>}
              {planError && <p className="text-sm text-red-600 dark:text-red-400">{planError}</p>}
            </>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Текущий тариф: <strong>{PRICING_PLANS.find((p) => p.id === plan)?.name ?? plan}</strong>.
              Смена тарифа доступна только для аккаунтов с входом по email/паролю.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

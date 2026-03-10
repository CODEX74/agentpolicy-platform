'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PRICING_PLANS } from '@/lib/constants/pricing';
import { useLang, type Lang } from '@/contexts/LanguageContext';

const t: Record<Lang, {
  openaiTitle: string;
  openaiDesc: string;
  openaiKeySaved: string;
  openaiLabel: string;
  save: string;
  profile: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailHint: string;
  newEmailPlaceholder: string;
  sendCode: string;
  codePlaceholder: string;
  confirmEmail: string;
  password: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  newPasswordPlaceholder: string;
  changePassword: string;
  telegram: string;
  telegramDesc: string;
  telegramLabel: string;
  telegramPlaceholder: string;
  plan: string;
  planPerMonth: string;
  savePlan: string;
  planLocked: string;
  errSave: string;
  errPassword: string;
  errPlan: string;
  errEmailChange: string;
  errConfirmEmail: string;
  nameSaved: string;
  passwordChanged: string;
  planUpdated: string;
  telegramSaved: string;
  openaiSaved: string;
  errPasswordsMismatch: string;
  errPasswordMin: string;
  errEnterNewEmail: string;
  errEnterEmailAndCode: string;
  codeSent: string;
  emailChanged: string;
}> = {
  ru: {
    openaiTitle: 'OpenAI (ChatGPT)',
    openaiDesc: 'Для работы агента вам нужно указать свой OpenAI API key. Ключ хранится в вашем аккаунте.',
    openaiKeySaved: 'Ключ уже сохранён. Если хотите заменить — вставьте новый и нажмите «Сохранить».',
    openaiLabel: 'OpenAI API key',
    save: 'Сохранить',
    profile: 'Профиль',
    name: 'Имя',
    namePlaceholder: 'Ваше имя',
    email: 'Email',
    emailHint: 'Текущий email. Ниже вы можете запросить смену адреса по коду подтверждения.',
    newEmailPlaceholder: 'Новый email',
    sendCode: 'Отправить код',
    codePlaceholder: 'Код из письма',
    confirmEmail: 'Подтвердить email',
    password: 'Пароль',
    currentPassword: 'Текущий пароль',
    newPassword: 'Новый пароль',
    confirmNewPassword: 'Подтвердите новый пароль',
    newPasswordPlaceholder: 'не менее 6 символов',
    changePassword: 'Сменить пароль',
    telegram: 'Telegram',
    telegramDesc: 'Чтобы бот отправлял вам сообщения и отвечал на команды, привяжите ваш Telegram chat id. Напишите боту /start — он покажет ваш chat id.',
    telegramLabel: 'Telegram chat id',
    telegramPlaceholder: 'например: 123456789',
    plan: 'Тарифный план',
    planPerMonth: '/мес',
    savePlan: 'Сохранить тариф',
    planLocked: 'Текущий тариф: Смена тарифа доступна только для аккаунтов с входом по email/паролю.',
    openaiSaved: 'API key сохранён',
    errSave: 'Не удалось сохранить',
    errPassword: 'Не удалось сменить пароль',
    errPlan: 'Не удалось сменить тариф',
    errEmailChange: 'Не удалось отправить код подтверждения',
    errConfirmEmail: 'Не удалось подтвердить смену email',
    nameSaved: 'Имя сохранено',
    passwordChanged: 'Пароль изменён',
    planUpdated: 'Тариф обновлён',
    telegramSaved: 'Telegram привязан',
    errPasswordsMismatch: 'Пароли не совпадают',
    errPasswordMin: 'Пароль не менее 6 символов',
    errEnterNewEmail: 'Введите новый email',
    errEnterEmailAndCode: 'Введите новый email и код подтверждения',
    codeSent: 'Код подтверждения отправлен на новый email. Введите его ниже, чтобы завершить смену.',
    emailChanged: 'Email изменён. Войдите заново, используя новый адрес.',
  },
  en: {
    openaiTitle: 'OpenAI (ChatGPT)',
    openaiDesc: 'To run agents you need to provide your OpenAI API key. The key is stored in your account.',
    openaiKeySaved: 'Key is already saved. To replace it, paste a new one and click Save.',
    openaiLabel: 'OpenAI API key',
    save: 'Save',
    profile: 'Profile',
    name: 'Name',
    namePlaceholder: 'Your name',
    email: 'Email',
    emailHint: 'Current email. Below you can request a change via confirmation code.',
    newEmailPlaceholder: 'New email',
    sendCode: 'Send code',
    codePlaceholder: 'Code from email',
    confirmEmail: 'Confirm email',
    password: 'Password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmNewPassword: 'Confirm new password',
    newPasswordPlaceholder: 'at least 6 characters',
    changePassword: 'Change password',
    telegram: 'Telegram',
    telegramDesc: 'To receive messages and commands from the bot, link your Telegram chat id. Send /start to the bot — it will show your chat id.',
    telegramLabel: 'Telegram chat id',
    telegramPlaceholder: 'e.g. 123456789',
    plan: 'Plan',
    planPerMonth: '/mo',
    savePlan: 'Save plan',
    planLocked: 'Current plan: Plan change is only available for email/password accounts.',
    openaiSaved: 'API key saved',
    errSave: 'Failed to save',
    errPassword: 'Failed to change password',
    errPlan: 'Failed to change plan',
    errEmailChange: 'Failed to send confirmation code',
    errConfirmEmail: 'Failed to confirm email change',
    nameSaved: 'Name saved',
    passwordChanged: 'Password changed',
    planUpdated: 'Plan updated',
    telegramSaved: 'Telegram linked',
    errPasswordsMismatch: 'Passwords do not match',
    errPasswordMin: 'Password must be at least 6 characters',
    errEnterNewEmail: 'Enter new email',
    errEnterEmailAndCode: 'Enter new email and confirmation code',
    codeSent: 'Confirmation code sent to the new email. Enter it below to complete the change.',
    emailChanged: 'Email changed. Sign in again using the new address.',
  },
};

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
  const lang = useLang();
  const text = t[lang];
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
        setProfileError(typeof data?.error === 'string' ? data.error : text.errSave);
        return;
      }
      setProfileMessage(text.nameSaved);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordError(text.errPasswordsMismatch);
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(text.errPasswordMin);
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
        setPasswordError(typeof data?.error === 'string' ? data.error : text.errPassword);
        return;
      }
      setPasswordMessage(text.passwordChanged);
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
        setPlanError(typeof data?.error === 'string' ? data.error : text.errPlan);
        return;
      }
      setPlanMessage(text.planUpdated);
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
        setTelegramError(typeof data?.error === 'string' ? data.error : text.errSave);
        return;
      }
      setTelegramMessage(text.telegramSaved);
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
        setOpenaiError(typeof data?.error === 'string' ? data.error : text.errSave);
        return;
      }
      setOpenaiMessage(text.openaiSaved);
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
      setEmailChangeError(text.errEnterNewEmail);
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
            : text.errEmailChange
        );
        return;
      }
      setEmailChangeMessage(text.codeSent);
    } finally {
      setEmailChangeLoading(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    setEmailChangeError(null);
    setEmailChangeMessage(null);
    if (!emailChangeNew.trim() || !emailChangeCode.trim()) {
      setEmailChangeError(text.errEnterEmailAndCode);
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
            : text.errConfirmEmail
        );
        return;
      }
      setEmailChangeMessage(
        (data?.message as string) ||
          text.emailChanged
      );
    } finally {
      setEmailChangeLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{text.openaiTitle}</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {text.openaiDesc}
          </p>
          {openaiHasKey === true && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {text.openaiKeySaved}
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {text.openaiLabel}
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
                {text.save}
              </Button>
            </div>
            {openaiMessage && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{openaiMessage}</p>}
            {openaiError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{openaiError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{text.profile}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {text.name}
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={text.namePlaceholder}
                disabled={profileLoading}
                className="max-w-xs"
              />
              <Button
                type="button"
                size="sm"
                disabled={profileLoading || !name.trim()}
                onClick={handleSaveProfile}
              >
                {text.save}
              </Button>
            </div>
            {profileMessage && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{profileMessage}</p>}
            {profileError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{profileError}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {text.email}
            </label>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{email}</p>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">
              {text.emailHint}
            </p>
            <div className="mt-3 space-y-2">
              <Input
                type="email"
                value={emailChangeNew}
                onChange={(e) => setEmailChangeNew(e.target.value)}
                placeholder={text.newEmailPlaceholder}
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
                  {text.sendCode}
                </Button>
                <Input
                  type="text"
                  value={emailChangeCode}
                  onChange={(e) => setEmailChangeCode(e.target.value)}
                  placeholder={text.codePlaceholder}
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
                  {text.confirmEmail}
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
          <h2 className="text-lg font-semibold">{text.password}</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {text.currentPassword}
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
              {text.newPassword}
            </label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={text.newPasswordPlaceholder}
              disabled={passwordLoading}
              className="max-w-xs"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {text.confirmNewPassword}
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
            {text.changePassword}
          </Button>
          {passwordMessage && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{passwordMessage}</p>}
          {passwordError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{text.telegram}</h2>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {text.telegramDesc}
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {text.telegramLabel}
            </label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder={text.telegramPlaceholder}
                disabled={telegramLoading}
                className="max-w-xs"
              />
              <Button
                type="button"
                size="sm"
                disabled={telegramLoading || !telegramId.trim()}
                onClick={handleSaveTelegram}
              >
                {text.save}
              </Button>
            </div>
            {telegramMessage && <p className="mt-1 text-sm text-emerald-600 dark:text-emerald-400">{telegramMessage}</p>}
            {telegramError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{telegramError}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{text.plan}</h2>
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
                      {p.name} — ${p.price}{text.planPerMonth}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  disabled={planLoading}
                  onClick={handleSavePlan}
                >
                  {text.savePlan}
                </Button>
              </div>
              {planMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{planMessage}</p>}
              {planError && <p className="text-sm text-red-600 dark:text-red-400">{planError}</p>}
            </>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {text.planLocked.split(':')[0]}: <strong>{PRICING_PLANS.find((p) => p.id === plan)?.name ?? plan}</strong>. {text.planLocked.split(':').slice(1).join(':').trim()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

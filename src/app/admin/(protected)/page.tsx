 'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface AdminAgent {
  id: string;
  name: string;
  agentType: string;
  demoBalance: number | null;
  createdAt: string;
}

interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  plan: string | null;
  telegramId: string | null;
  createdAt: string;
  password: string | null;
  openaiApiKey: string | null;
  agents: AdminAgent[];
}

interface UsersResponse {
  users: AdminUser[];
}

const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error('Ошибка загрузки');
      return res.json();
    })
    .then((data) => data as UsersResponse);

export default function AdminDashboardPage() {
  const { data, error, isLoading, mutate } = useSWR<UsersResponse>('/api/admin/users', fetcher);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<Record<string, string>>({});

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Удалить пользователя со всеми агентами и данными?')) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Не удалось удалить пользователя');
      return;
    }
    mutate();
  };

  const handleChangePassword = async (id: string) => {
    const newPassword = passwords[id];
    if (!newPassword) {
      alert('Введите новый пароль');
      return;
    }
    const res = await fetch(`/api/admin/users/${id}/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    if (!res.ok) {
      alert('Не удалось изменить пароль');
      return;
    }
    setPasswords((prev) => ({ ...prev, [id]: '' }));
    mutate();
  };

  const handleClearApiKey = async (id: string) => {
    const res = await fetch(`/api/admin/users/${id}/openai-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ openaiApiKey: null }),
    });
    if (!res.ok) {
      alert('Не удалось очистить API key');
      return;
    }
    mutate();
  };

  const handleSaveProfile = async (id: string) => {
    const name = names[id];
    const plan = plans[id];
    const res = await fetch(`/api/admin/users/${id}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(name !== undefined ? { name } : {}),
        ...(plan !== undefined ? { plan } : {}),
      }),
    });
    if (!res.ok) {
      alert('Не удалось сохранить профиль пользователя');
      return;
    }
    mutate();
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/';
  };

  const users = data?.users ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold">Админ-панель</h1>
          <p className="text-sm text-zinc-400">
            Пользователи, их агенты, пароли и API-ключи.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          Выйти
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {isLoading && <p className="text-sm text-zinc-400">Загрузка пользователей…</p>}
        {error && (
          <p className="text-sm text-red-400">Не удалось загрузить пользователей. Перезагрузите страницу.</p>
        )}

        {!isLoading && !error && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              Всего пользователей: <span className="font-semibold text-zinc-50">{users.length}</span>
            </p>

            <div className="space-y-4">
              {users.map((user) => {
                const maskedPassword = user.password
                  ? `${user.password.slice(0, 8)}… (${user.password.length} символов, хэш)`
                  : '—';
                const maskedKey = user.openaiApiKey
                  ? `${user.openaiApiKey.slice(0, 8)}…`
                  : '—';

                return (
                  <div
                    key={user.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-zinc-50">
                          {user.email || 'Без email'}
                        </p>
                        <p className="text-xs text-zinc-400">
                          ID: {user.id}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Telegram ID: {user.telegramId || '—'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Создан: {new Date(user.createdAt).toLocaleString('ru-RU')}
                        </p>
                      </div>
                      <div className="mt-2 flex gap-2 sm:mt-0">
                        <Button type="button" size="sm" onClick={() => handleDeleteUser(user.id)}>
                          Удалить пользователя
                        </Button>
                      </div>
                    </div>

                      <div className="mt-3 grid gap-4 md:grid-cols-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-zinc-300">Профиль</p>
                        <div className="space-y-1">
                          <Input
                            type="text"
                            placeholder="Имя"
                            defaultValue={user.name ?? ''}
                            onChange={(e) =>
                              setNames((prev) => ({ ...prev, [user.id]: e.target.value }))
                            }
                          />
                          <Select
                            defaultValue={user.plan ?? 'free'}
                            onChange={(e) =>
                              setPlans((prev) => ({ ...prev, [user.id]: e.target.value }))
                            }
                          >
                            <option value="free">Free</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                          </Select>
                          <div className="mt-1 flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveProfile(user.id)}
                            >
                              Сохранить профиль
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => (window.location.href = `/admin/users/${user.id}/analytics`)}
                            >
                              Аналитика
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-zinc-300">Пароль (хэш)</p>
                        <p className="break-all text-xs text-zinc-500">{maskedPassword}</p>
                        <div className="mt-2 space-y-1">
                          <Input
                            type="text"
                            placeholder="Новый пароль"
                            value={passwords[user.id] ?? ''}
                            onChange={(e) =>
                              setPasswords((prev) => ({ ...prev, [user.id]: e.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleChangePassword(user.id)}
                          >
                            Изменить пароль
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-zinc-300">OpenAI API key</p>
                        <p className="break-all text-xs text-zinc-500">{maskedKey}</p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleClearApiKey(user.id)}
                          >
                            Очистить ключ
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs font-medium text-zinc-300">
                          Агенты ({user.agents.length})
                        </p>
                        <div className="space-y-1">
                          {user.agents.length === 0 && (
                            <p className="text-xs text-zinc-500">Агенты не созданы.</p>
                          )}
                          {user.agents.slice(0, 4).map((agent) => (
                            <p key={agent.id} className="text-xs text-zinc-400">
                              {agent.name} · {agent.agentType} · демо:{' '}
                              {agent.demoBalance ?? 0} USDT
                            </p>
                          ))}
                          {user.agents.length > 4 && (
                            <p className="text-xs text-zinc-500">
                              И ещё {user.agents.length - 4}…
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


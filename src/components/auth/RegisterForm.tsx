'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setError('Ошибка регистрации');
      return;
    }
    await signIn('credentials', { email: data.email, password: data.password, redirect: true, callbackUrl: '/dashboard' });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input {...register('name')} placeholder="Имя" />
      <Input {...register('email')} type="email" placeholder="Email" />
      <Input {...register('password')} type="password" placeholder="Пароль" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full">Зарегистрироваться</Button>
    </form>
  );
}

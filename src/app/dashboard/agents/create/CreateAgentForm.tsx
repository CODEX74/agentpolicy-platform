'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

const schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateAgentForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      setError('Ошибка создания агента');
      return;
    }
    const agent = await res.json();
    router.push(`/dashboard/agents/${agent._id}`);
  };

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Название</label>
            <Input {...register('name')} placeholder="Мой агент" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Описание (необязательно)</label>
            <Input {...register('description')} placeholder="Описание агента" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Создание...' : 'Создать'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

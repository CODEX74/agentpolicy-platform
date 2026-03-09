'use client';

import { cn } from '@/lib/utils/cn';

export function Toast({
  message,
  variant = 'default',
  className,
}: {
  message: string;
  variant?: 'default' | 'success' | 'error';
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        variant === 'error' && 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950',
        variant === 'success' && 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950',
        variant === 'default' && 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950',
        className
      )}
    >
      {message}
    </div>
  );
}

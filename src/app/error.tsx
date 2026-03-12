'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error.message, error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Что-то пошло не так
      </h2>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Произошла ошибка при загрузке. Попробуйте обновить страницу.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Обновить
      </button>
    </div>
  );
}

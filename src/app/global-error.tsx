'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ru">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-lg font-semibold">Ошибка приложения</h2>
          <p className="max-w-md text-sm text-zinc-600">
            Произошла серверная ошибка. Попробуйте обновить страницу.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Обновить
          </button>
        </div>
      </body>
    </html>
  );
}

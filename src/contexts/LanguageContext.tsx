'use client';

import { createContext, useContext, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

export type Lang = 'ru' | 'en';

const LanguageContext = createContext<Lang>('ru');

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const lang = useMemo<Lang>(
    () => (searchParams.get('lang') === 'en' ? 'en' : 'ru'),
    [searchParams]
  );
  return (
    <LanguageContext.Provider value={lang}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): Lang {
  const ctx = useContext(LanguageContext);
  return ctx ?? 'ru';
}

/** Добавляет ?lang=en к href при lang === 'en' */
export function withLang(href: string, lang: Lang): string {
  if (lang === 'en') {
    const sep = href.includes('?') ? '&' : '?';
    return `${href}${sep}lang=en`;
  }
  return href;
}

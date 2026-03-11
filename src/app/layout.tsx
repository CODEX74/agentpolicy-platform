import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { LanguageProvider } from '@/contexts/LanguageContext';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: `${process.env.NEXT_PUBLIC_APP_NAME ?? 'AgentWallet'} — Управление финансами AI-агентов`,
  description: 'Платформа для управления финансами AI-агентов с визуальным конструктором политик',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <Suspense fallback={null}>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </Suspense>
        </SessionProvider>
      </body>
    </html>
  );
}

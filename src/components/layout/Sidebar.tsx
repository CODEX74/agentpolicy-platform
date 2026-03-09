'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { LayoutDashboard, Bot, Wallet, FileText, BarChart3, Settings, CreditCard } from 'lucide-react';

const items = [
  { href: '/dashboard', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/dashboard/agents', label: 'Агенты', icon: Bot },
  { href: '/dashboard/transactions', label: 'Транзакции', icon: Wallet },
  { href: '/dashboard/analytics', label: 'Аналитика', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Настройки', icon: Settings },
  { href: '/dashboard/settings/billing', label: 'Оплата', icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const hasMoreSpecific = items.some(
            (other) => other.href !== item.href && pathname.startsWith(other.href)
          );
          const isActive =
            pathname === item.href ||
            (pathname.startsWith(item.href + '/') && !hasMoreSpecific);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-zinc-900/10 text-zinc-900 dark:bg-white/10 dark:text-zinc-50'
                  : 'text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-50'
              )}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

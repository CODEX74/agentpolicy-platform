'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLang, type Lang } from '@/contexts/LanguageContext';

interface DataPoint {
  date: string;
  balance: number;
}

function formatDateShort(iso: string, locale: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function formatBalance(value: number, locale: string) {
  const num = Number.isFinite(value) ? value : 0;
  const hasFraction = Math.abs(num % 1) > 0;
  return num.toLocaleString(locale, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
}

const t: Record<Lang, { noData: string; volume: string }> = {
  ru: { noData: 'Нет данных для графика', volume: 'Объём' },
  en: { noData: 'No chart data', volume: 'Volume' },
};

export function BalanceChart({ data }: { data: DataPoint[] }) {
  const lang = useLang();
  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  const text = t[lang];

  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">{text.noData}</p>
      </div>
    );
  }

  const maxBalance = Math.max(...data.map((d) => d.balance), 1);
  const fmtShort = (iso: string) => formatDateShort(iso, locale);
  const fmtBal = (v: number) => formatBalance(v, locale);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtShort}
            className="text-xs"
            interval="preserveStartEnd"
          />
          <YAxis
            className="text-xs"
            domain={[0, maxBalance]}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : fmtBal(Number(v))
            }
          />
          <Tooltip
            formatter={(value: any) => [`${fmtBal(Number(value ?? 0))} USDT`, text.volume]}
            labelFormatter={(label) => fmtShort(String(label))}
          />
          <Area
            type="monotone"
            dataKey="balance"
            name={text.volume}
            stroke="#6366F1"
            fill="#6366F1"
            fillOpacity={0.2}
            strokeWidth={1.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

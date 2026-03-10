'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DataPoint {
  date: string;
  balance: number;
}

function formatDateShort(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatBalance(value: number) {
  const num = Number.isFinite(value) ? value : 0;
  const hasFraction = Math.abs(num % 1) > 0;
  return num.toLocaleString('ru-RU', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  });
}

export function BalanceChart({ data }: { data: DataPoint[] }) {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">Нет данных для графика</p>
      </div>
    );
  }

  const maxBalance = Math.max(...data.map((d) => d.balance), 1);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            className="text-xs"
            interval="preserveStartEnd"
          />
          <YAxis
            className="text-xs"
            domain={[0, maxBalance]}
            tickFormatter={(v) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : formatBalance(Number(v))
            }
          />
          <Tooltip
            // тип any здесь допустим: форматируем только числовое значение для тултипа
            formatter={(value: any) => [`${formatBalance(Number(value ?? 0))} USDT`, 'Объём']}
            labelFormatter={(label) => formatDateShort(String(label))}
          />
          <Area
            type="monotone"
            dataKey="balance"
            name="Объём"
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

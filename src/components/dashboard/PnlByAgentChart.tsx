'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PnlRecord {
  agentId: string;
  name: string;
  pnlTotal: number;
}

export function PnlByAgentChart({ data }: { data: PnlRecord[] }) {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">Нет данных по P&amp;L агентов</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" />
          <XAxis
            dataKey="name"
            className="text-xs"
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis
            className="text-xs"
            tickFormatter={(v) => (v >= 1000 || v <= -1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
          />
          <Tooltip formatter={(value: any) => [`${Number(value ?? 0).toFixed(2)} USDT`, 'PnL']} />
          <Bar
            dataKey="pnlTotal"
            name="PnL, USDT"
            fill="var(--color-foreground)"
            fillOpacity={0.7}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


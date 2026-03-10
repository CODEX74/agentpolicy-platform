'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface AssetSlice {
  asset: string;
  valueUsd: number;
}

const COLORS = [
  '#6366F1',
  '#EC4899',
  '#22C55E',
  '#F97316',
  '#06B6D4',
  '#EAB308',
  '#8B5CF6',
  '#F43F5E',
  '#14B8A6',
  '#0EA5E9',
];

export function AssetAllocationChart({ data }: { data: AssetSlice[] }) {
  const nonZero = data.filter((d) => d.valueUsd > 0);

  if (!nonZero.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">Нет открытых позиций по активам</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={nonZero}
            dataKey="valueUsd"
            nameKey="asset"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={(props) => {
              const payload = props?.payload as AssetSlice | undefined;
              return payload?.asset ?? '';
            }}
          >
            {nonZero.map((entry, index) => (
              <Cell
                key={entry.asset}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, _name, entry: any) => [
              `${Number(value ?? 0).toFixed(2)} USDT`,
              entry?.payload?.asset ?? 'Актив',
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


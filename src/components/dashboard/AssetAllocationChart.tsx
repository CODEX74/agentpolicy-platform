'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useLang, type Lang } from '@/contexts/LanguageContext';

interface AssetSlice {
  asset: string;
  value: number;
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

const t: Record<Lang, { noPositions: string; asset: string }> = {
  ru: { noPositions: 'Нет открытых позиций по активам', asset: 'Актив' },
  en: { noPositions: 'No open positions by asset', asset: 'Asset' },
};

interface AssetAllocationChartProps {
  data: AssetSlice[];
  unit?: string;
}

export function AssetAllocationChart({ data, unit = 'USDT' }: AssetAllocationChartProps) {
  const lang = useLang();
  const text = t[lang];
  const nonZero = data.filter((d) => d.value > 0);

  if (!nonZero.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">{text.noPositions}</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={nonZero}
            dataKey="value"
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
              `${Number(value ?? 0).toFixed(4)} ${unit}`,
              entry?.payload?.asset ?? text.asset,
            ]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


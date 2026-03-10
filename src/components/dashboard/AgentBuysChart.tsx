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

interface AgentBuyPoint {
  date: string;
  agentId: string;
  name: string;
  buyAmount: number;
}

export function AgentBuysChart({ data }: { data: AgentBuyPoint[] }) {
  if (!data?.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-zinc-500">Нет данных по покупкам агентов</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full space-y-4">
      {Array.from(
        data.reduce((map, point) => {
          if (!map.has(point.agentId)) map.set(point.agentId, []);
          map.get(point.agentId)!.push(point);
          return map;
        }, new Map<string, AgentBuyPoint[]>())
      ).map(([agentId, points]) => {
        const name = points[0]?.name ?? agentId;
        return (
          <div
            key={agentId}
            className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{name}</p>
            <div className="mt-2 h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-zinc-200 dark:stroke-zinc-700"
                  />
                  <XAxis
                    dataKey="date"
                    className="text-xs"
                    interval="preserveStartEnd"
                    angle={-20}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(v) =>
                      v >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : String(v)
                    }
                  />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value ?? 0).toFixed(2)} USDT`, 'Покупки']}
                  />
                  <Bar
                    dataKey="buyAmount"
                    name="Покупки, USDT"
                    fill="var(--color-foreground)"
                    fillOpacity={0.7}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}


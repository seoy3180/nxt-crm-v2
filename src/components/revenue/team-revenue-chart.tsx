'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatAmount } from '@/lib/utils';
import { REVENUE_COLORS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamRevenueChartProps {
  teams: { teamName: string; revenue: number }[];
  unallocated: number;
  loading?: boolean;
}

const TEAM_COLOR_MAP: Record<string, string> = {
  MSP팀: REVENUE_COLORS.msp,
  교육팀: REVENUE_COLORS.tt,
  개발팀: REVENUE_COLORS.dev,
};

function getBarColor(name: string) {
  return TEAM_COLOR_MAP[name] ?? REVENUE_COLORS.unallocated;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; revenue: number } }[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  if (!item) return null;
  const { name, revenue } = item.payload;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-zinc-700">{name}</p>
      <p className="text-zinc-900">{formatAmount(revenue)}</p>
    </div>
  );
}

export function TeamRevenueChart({
  teams,
  unallocated,
  loading,
}: TeamRevenueChartProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-200 p-5 h-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const chartData: { name: string; revenue: number }[] = teams.map((t) => ({
    name: t.teamName,
    revenue: t.revenue,
  }));

  if (unallocated > 0) {
    chartData.push({ name: '미배분', revenue: unallocated });
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-5 h-full">
      <h3 className="text-base font-semibold mb-4">팀별 매출 비교</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 13 }} />
          <YAxis
            tickFormatter={(v: number) =>
              `${Math.round(v / 10000).toLocaleString()}만`
            }
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f4f5' }} />
          <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={getBarColor(entry.name)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

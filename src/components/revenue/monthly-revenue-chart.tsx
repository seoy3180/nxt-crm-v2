'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { REVENUE_COLORS } from '@/lib/constants';
import { formatAmount } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월',
];

interface MonthlyData {
  month: number;
  msp: number;
  tt: number;
  dev: number;
  total: number;
}

interface MonthlyRevenueChartProps {
  data: MonthlyData[];
  prevYearData?: MonthlyData[];
  loading?: boolean;
  typeFilter: string; // 'all' | 'msp' | 'tt' | 'dev'
  showYoY: boolean;
}

type TypeKey = 'msp' | 'tt' | 'dev';

interface ChartRow {
  name: string;
  [key: string]: string | number;
}

function buildChartData(
  data: MonthlyData[],
  prevYearData: MonthlyData[] | undefined,
  typeFilter: string,
  showYoY: boolean,
): ChartRow[] {
  return MONTH_LABELS.map((label, i) => {
    const month = i + 1;
    const cur = data.find((d) => d.month === month);
    const prev = prevYearData?.find((d) => d.month === month);

    const row: ChartRow = { name: label };

    if (typeFilter === 'all') {
      row['전사 매출'] = cur?.total ?? 0;
      if (showYoY && prev) {
        row['전년 매출'] = prev.total;
      }
    } else {
      const key = typeFilter as TypeKey;
      row['매출'] = cur?.[key] ?? 0;
      if (showYoY && prev) {
        row['전년 매출'] = prev[key];
      }
    }

    return row;
  });
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border bg-white p-3 shadow-md">
      <p className="mb-1 text-sm font-semibold text-zinc-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatAmount(entry.value)}
        </p>
      ))}
    </div>
  );
}

function yAxisFormatter(value: number) {
  if (value === 0) return '0';
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}억`;
  return `${Math.round(value / 10000)}만`;
}

export function MonthlyRevenueChart({
  data,
  prevYearData,
  loading = false,
  typeFilter,
  showYoY,
}: MonthlyRevenueChartProps) {
  if (loading) {
    return <Skeleton className="h-[300px] w-full rounded-xl" />;
  }

  const chartData = buildChartData(data, prevYearData, typeFilter, showYoY);

  const mainKey = typeFilter === 'all' ? '전사 매출' : '매출';
  const mainColor = typeFilter === 'all'
    ? '#3b82f6'
    : REVENUE_COLORS[typeFilter as TypeKey];

  return (
    <div className="rounded-xl bg-zinc-50 p-5">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="name" fontSize={12} tickLine={false} />
          <YAxis tickFormatter={yAxisFormatter} fontSize={12} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend fontSize={12} />
          {showYoY && prevYearData && (
            <Line
              type="monotone"
              dataKey="전년 매출"
              stroke={mainColor}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              dot={false}
            />
          )}
          <Line
            type="monotone"
            dataKey={mainKey}
            stroke={mainColor}
            strokeWidth={2.5}
            dot={{ r: 4, fill: mainColor, stroke: 'white', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

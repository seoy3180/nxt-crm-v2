'use client';

import {
  BarChart,
  Bar,
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

function getTypeColor(type: TypeKey) {
  return REVENUE_COLORS[type];
}

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
      row['MSP'] = cur?.msp ?? 0;
      row['교육'] = cur?.tt ?? 0;
      row['개발'] = cur?.dev ?? 0;

      if (showYoY && prev) {
        row['전년 MSP'] = prev.msp;
        row['전년 교육'] = prev.tt;
        row['전년 개발'] = prev.dev;
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

  const renderBars = () => {
    if (typeFilter === 'all') {
      return (
        <>
          {showYoY && prevYearData && (
            <>
              <Bar
                dataKey="전년 MSP"
                fill={REVENUE_COLORS.msp}
                opacity={0.3}
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="전년 교육"
                fill={REVENUE_COLORS.tt}
                opacity={0.3}
                radius={[2, 2, 0, 0]}
              />
              <Bar
                dataKey="전년 개발"
                fill={REVENUE_COLORS.dev}
                opacity={0.3}
                radius={[2, 2, 0, 0]}
              />
            </>
          )}
          <Bar
            dataKey="MSP"
            stackId="current"
            fill={REVENUE_COLORS.msp}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="교육"
            stackId="current"
            fill={REVENUE_COLORS.tt}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            dataKey="개발"
            stackId="current"
            fill={REVENUE_COLORS.dev}
            radius={[2, 2, 0, 0]}
          />
        </>
      );
    }

    const key = typeFilter as TypeKey;
    const color = getTypeColor(key);

    return (
      <>
        {showYoY && prevYearData && (
          <Bar
            dataKey="전년 매출"
            fill={color}
            opacity={0.3}
            radius={[2, 2, 0, 0]}
          />
        )}
        <Bar dataKey="매출" fill={color} radius={[4, 4, 0, 0]} />
      </>
    );
  };

  return (
    <div className="rounded-xl bg-zinc-50 p-5">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="name" fontSize={12} tickLine={false} />
          <YAxis tickFormatter={yAxisFormatter} fontSize={12} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend fontSize={12} />
          {renderBars()}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

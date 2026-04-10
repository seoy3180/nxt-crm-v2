'use client';

import { formatAmount } from '@/lib/utils';

interface MonthlyData {
  month: number;
  total: number;
}

interface QuarterlySummaryProps {
  data: MonthlyData[];
}

const QUARTERS = [
  { label: '1분기', months: [1, 2, 3] },
  { label: '2분기', months: [4, 5, 6] },
  { label: '3분기', months: [7, 8, 9] },
  { label: '4분기', months: [10, 11, 12] },
];

function sumByMonths(data: MonthlyData[], months: number[]): number {
  return data
    .filter((d) => months.includes(d.month))
    .reduce((sum, d) => sum + d.total, 0);
}

export function QuarterlySummary({ data }: QuarterlySummaryProps) {
  const annualTotal = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="flex gap-3">
      {QUARTERS.map((q) => (
        <div
          key={q.label}
          className="flex-1 rounded-xl border border-zinc-200 p-4 space-y-1"
        >
          <p className="text-xs font-medium text-zinc-500">{q.label}</p>
          <p className="text-lg font-bold text-zinc-900">
            {formatAmount(sumByMonths(data, q.months))}
          </p>
        </div>
      ))}

      <div className="flex-1 rounded-xl border border-blue-600 bg-blue-50 p-4 space-y-1">
        <p className="text-xs font-medium text-blue-600">연간 합계</p>
        <p className="text-lg font-bold text-blue-600">
          {formatAmount(annualTotal)}
        </p>
      </div>
    </div>
  );
}

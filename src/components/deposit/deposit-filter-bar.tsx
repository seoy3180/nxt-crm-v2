'use client';

import type { DepositAccountWithMetrics } from '@/lib/services/deposit-service';

export type DepositFilter = 'all' | 'critical' | 'warning';

export function DepositFilterBar({
  value,
  onChange,
  accounts,
}: {
  value: DepositFilter;
  onChange: (v: DepositFilter) => void;
  accounts: DepositAccountWithMetrics[];
}) {
  // metrics.alertLevel — 카드/KPI/사이드바 배지와 동일 source.
  const critical = accounts.filter((a) => a.metrics.alertLevel === 'critical').length;
  const warning = accounts.filter((a) => a.metrics.alertLevel === 'warning').length;

  const base = 'h-8 rounded-lg px-3 text-[13px] font-medium transition-colors';
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`${base} ${value === 'all' ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'}`}
      >
        전체 ({accounts.length})
      </button>
      <button
        type="button"
        onClick={() => onChange('critical')}
        className={`${base} ${value === 'critical' ? 'bg-red-600 text-white' : 'border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'}`}
      >
        긴급 ({critical})
      </button>
      <button
        type="button"
        onClick={() => onChange('warning')}
        className={`${base} ${value === 'warning' ? 'bg-amber-500 text-white' : 'border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300'}`}
      >
        주의 ({warning})
      </button>
    </div>
  );
}

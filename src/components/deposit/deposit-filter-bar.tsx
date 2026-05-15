'use client';

import { DEPOSIT_ALERT_THRESHOLDS } from '@/lib/deposit/constants';
import type { DepositAccountWithContract } from '@/lib/services/deposit-service';

export type DepositFilter = 'all' | 'critical' | 'warning';

export function DepositFilterBar({
  value,
  onChange,
  accounts,
}: {
  value: DepositFilter;
  onChange: (v: DepositFilter) => void;
  accounts: DepositAccountWithContract[];
}) {
  // 1차 카운트 (KPI/배지와 동일 로직, 카드의 정밀 alertLevel과는 다를 수 있음)
  const critical = accounts.filter((a) => {
    if (a.balance < 0) return true;
    if (a.total_deposit <= 0) return false;
    return (a.balance / a.total_deposit) * 100 < DEPOSIT_ALERT_THRESHOLDS.critical.balancePct;
  }).length;
  const warning = accounts.filter((a) => {
    if (a.balance < 0) return false;
    if (a.total_deposit <= 0) return false;
    const pct = (a.balance / a.total_deposit) * 100;
    return (
      pct >= DEPOSIT_ALERT_THRESHOLDS.critical.balancePct &&
      pct < DEPOSIT_ALERT_THRESHOLDS.warning.balancePct
    );
  }).length;

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

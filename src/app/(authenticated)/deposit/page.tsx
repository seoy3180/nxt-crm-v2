'use client';

import { useMemo, useState } from 'react';
import { useDepositAccounts } from '@/hooks/use-deposit-accounts';
import { DepositKpiRow } from '@/components/deposit/deposit-kpi-row';
import { DepositFilterBar, type DepositFilter } from '@/components/deposit/deposit-filter-bar';
import { DepositCard } from '@/components/deposit/deposit-card';
import { DepositEmptyState } from '@/components/deposit/deposit-empty-state';
import { DEPOSIT_ALERT_THRESHOLDS } from '@/lib/deposit/constants';
import type { DepositAccountWithContract } from '@/lib/services/deposit-service';
import type { AlertLevel } from '@/lib/deposit/types';

/**
 * 1차 alertLevel 판정 (트랜잭션 미조회 — KPI/사이드바와 동일 로직).
 * 카드 자체는 useDepositTransactions로 정밀 판정하므로 표시 불일치 가능.
 */
function quickAlertLevel(a: DepositAccountWithContract): AlertLevel {
  if (a.balance < 0) return 'critical';
  if (a.total_deposit <= 0) return 'critical';
  const pct = (a.balance / a.total_deposit) * 100;
  if (pct < DEPOSIT_ALERT_THRESHOLDS.critical.balancePct) return 'critical';
  if (pct < DEPOSIT_ALERT_THRESHOLDS.warning.balancePct) return 'warning';
  return 'ok';
}

const ORDER: Record<AlertLevel, number> = { critical: 0, warning: 1, ok: 2 };

export default function DepositDashboardPage() {
  const [filter, setFilter] = useState<DepositFilter>('all');
  const { data: accounts = [], isLoading } = useDepositAccounts();

  const sorted = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const la = ORDER[quickAlertLevel(a)];
      const lb = ORDER[quickAlertLevel(b)];
      if (la !== lb) return la - lb;
      // 동일 레벨 내에서는 잔액% 오름차순 (긴박한 순)
      const pa = a.total_deposit > 0 ? a.balance / a.total_deposit : 0;
      const pb = b.total_deposit > 0 ? b.balance / b.total_deposit : 0;
      return pa - pb;
    });
  }, [accounts]);

  const filtered = useMemo(() => {
    if (filter === 'all') return sorted;
    return sorted.filter((a) => quickAlertLevel(a) === filter);
  }, [sorted, filter]);

  if (!isLoading && accounts.length === 0) return <DepositEmptyState />;

  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">예치금 대시보드</h1>
        <p className="mt-1 text-sm text-zinc-500">MSP 계약 선결제 예치금 운영 현황</p>
      </header>

      <DepositKpiRow accounts={accounts} />
      <DepositFilterBar value={filter} onChange={setFilter} accounts={accounts} />

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
          {filter === 'critical' ? '긴급 알림 계좌가 없습니다 ✓' : '주의 계좌가 없습니다'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((a) => (
            <DepositCard key={a.id} account={a} />
          ))}
        </div>
      )}
    </div>
  );
}

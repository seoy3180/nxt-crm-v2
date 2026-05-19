'use client';

import { useMemo, useState } from 'react';
import { useDepositAccounts } from '@/hooks/use-deposit-accounts';
import { DepositKpiRow } from '@/components/deposit/deposit-kpi-row';
import { DepositFilterBar, type DepositFilter } from '@/components/deposit/deposit-filter-bar';
import { DepositCard } from '@/components/deposit/deposit-card';
import { DepositEmptyState } from '@/components/deposit/deposit-empty-state';
import type { AlertLevel } from '@/lib/deposit/types';

const ORDER: Record<AlertLevel, number> = { critical: 0, warning: 1, ok: 2 };

export default function DepositDashboardPage() {
  const [filter, setFilter] = useState<DepositFilter>('all');
  const { data: accounts = [], isLoading } = useDepositAccounts();

  const sorted = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const la = ORDER[a.metrics.alertLevel];
      const lb = ORDER[b.metrics.alertLevel];
      if (la !== lb) return la - lb;
      // 동일 레벨 내 잔액% 오름차순 (긴박한 순)
      return a.metrics.balancePct - b.metrics.balancePct;
    });
  }, [accounts]);

  const filtered = useMemo(() => {
    if (filter === 'all') return sorted;
    return sorted.filter((a) => a.metrics.alertLevel === filter);
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

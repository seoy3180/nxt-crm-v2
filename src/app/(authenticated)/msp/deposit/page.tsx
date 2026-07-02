'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useDepositAccounts, useActivatableContracts } from '@/hooks/use-deposit-accounts';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Input } from '@/components/ui/input';
import { DepositKpiRow } from '@/components/deposit/deposit-kpi-row';
import { DepositFilterBar, type DepositFilter } from '@/components/deposit/deposit-filter-bar';
import { DepositCard } from '@/components/deposit/deposit-card';
import { DepositActivatableRow } from '@/components/deposit/deposit-activatable-row';
import { DepositEmptyState } from '@/components/deposit/deposit-empty-state';
import type { AlertLevel } from '@/lib/deposit/types';

const ORDER: Record<AlertLevel, number> = { critical: 0, warning: 1, ok: 2 };

export default function DepositDashboardPage() {
  const [filter, setFilter] = useState<DepositFilter>('all');
  const [search, setSearch] = useState('');
  const { data: accounts = [], isLoading } = useDepositAccounts();
  const { data: activatable = [] } = useActivatableContracts();
  const { data: currentUser } = useCurrentUser();

  const canManage =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'c_level' ||
    currentUser?.role === 'team_lead';

  const q = search.trim().toLowerCase();

  // 활성 계좌: 정렬(긴급→주의→정상→잔액%) → 알림레벨 필터 → 검색
  const sorted = useMemo(
    () =>
      [...accounts].sort((a, b) => {
        const d = ORDER[a.metrics.alertLevel] - ORDER[b.metrics.alertLevel];
        return d !== 0 ? d : a.metrics.balancePct - b.metrics.balancePct;
      }),
    [accounts],
  );

  const cards = useMemo(() => {
    let list = sorted;
    if (filter === 'critical' || filter === 'warning') {
      list = list.filter((a) => a.metrics.alertLevel === filter);
    }
    if (q) {
      list = list.filter(
        (a) =>
          a.contract.name.toLowerCase().includes(q) ||
          (a.contract.client_name ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [sorted, filter, q]);

  // 미설정 탭: 활성화 대상 계약 + 검색 (탭 종속)
  const inactiveList = useMemo(() => {
    if (!q) return activatable;
    return activatable.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.client_name ?? '').toLowerCase().includes(q),
    );
  }, [activatable, q]);

  if (!isLoading && accounts.length === 0 && activatable.length === 0) {
    return <DepositEmptyState />;
  }

  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">예치금 대시보드</h1>
        <p className="mt-1 text-sm text-zinc-500">MSP 계약 선결제 예치금 운영 현황</p>
      </header>

      <DepositKpiRow accounts={accounts} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DepositFilterBar
          value={filter}
          onChange={setFilter}
          accounts={accounts}
          activatableCount={activatable.length}
        />
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder={filter === 'inactive' ? '미설정 계약 검색...' : '계약명, 고객명 검색...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 rounded-md border-zinc-200 pl-9 text-[13px]"
          />
        </div>
      </div>

      {filter === 'inactive' ? (
        inactiveList.length === 0 ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
            {q ? '검색 결과가 없습니다' : '예치금 미설정 MSP 계약이 없습니다 ✓'}
          </div>
        ) : (
          <div className="space-y-2">
            {inactiveList.map((c) => (
              <DepositActivatableRow key={c.id} contract={c} canManage={canManage} />
            ))}
          </div>
        )
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
          {q
            ? '검색 결과가 없습니다'
            : filter === 'critical'
              ? '긴급 알림 계좌가 없습니다 ✓'
              : '주의 계좌가 없습니다'}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {cards.map((a) => (
            <DepositCard key={a.id} account={a} />
          ))}
        </div>
      )}
    </div>
  );
}

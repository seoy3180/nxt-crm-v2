# 매출 분석 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전사 매출 분석 페이지 구현 — 연간 현황 (월별 Recharts 차트 + 분기 합계) + 팀별 분석 (팀별 차트 + 순위 테이블), 역할별 접근 제한

**Architecture:** `/revenue` 페이지에 탭 2개 (연간 현황, 팀별 분석). 데이터는 Supabase 클라이언트 쿼리로 집계하고 React Query로 캐싱. Recharts BarChart로 시각화. 필터 상태는 URL searchParams로 관리. 권한은 기존 `canAccessFeature` + `useCurrentUser`로 체크.

**Tech Stack:** Next.js 15 App Router, Supabase, React Query, Recharts, Tailwind CSS, shadcn/ui

---

## 파일 구조

```
신규 생성:
  src/app/(authenticated)/revenue/page.tsx          — 메인 페이지 (탭 + Suspense)
  src/components/revenue/monthly-revenue-chart.tsx   — 월별 매출 Recharts 차트
  src/components/revenue/quarterly-summary.tsx       — 분기별 합계 카드
  src/components/revenue/team-revenue-chart.tsx      — 팀별 매출 Recharts 차트
  src/components/revenue/team-ranking-table.tsx      — 팀별 순위 테이블
  src/hooks/use-revenue.ts                          — 매출 데이터 훅 (월별 + 팀별)

수정:
  src/lib/constants.ts                              — REVENUE_COLORS 상수 추가
```

---

### Task 1: 매출 색상 상수 + 데이터 훅

**Files:**
- Modify: `src/lib/constants.ts`
- Create: `src/hooks/use-revenue.ts`

- [ ] **Step 1: constants.ts에 매출 색상 추가**

`src/lib/constants.ts` 파일 하단에 추가:

```typescript
// 매출 분석 색상
export const REVENUE_COLORS = {
  msp: '#2563eb',
  tt: '#f59e0b',
  dev: '#71717a',
  unallocated: '#e4e4e7',
} as const;
```

- [ ] **Step 2: use-revenue.ts 훅 생성**

`src/hooks/use-revenue.ts` 생성:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface MonthlyRevenue {
  month: number;
  msp: number;
  tt: number;
  dev: number;
  total: number;
}

interface TeamRevenue {
  teamId: string;
  teamName: string;
  revenue: number;
}

interface TeamRevenueResult {
  teams: TeamRevenue[];
  unallocated: number;
}

export function useMonthlyRevenue(year: number, type?: string) {
  return useQuery({
    queryKey: ['monthly-revenue', year, type],
    queryFn: async (): Promise<MonthlyRevenue[]> => {
      const supabase = createClient();

      let q = supabase
        .from('contracts')
        .select('created_at, type, total_amount')
        .is('deleted_at', null)
        .gte('created_at', `${year}-01-01`)
        .lt('created_at', `${year + 1}-01-01`);

      if (type && type !== 'all') {
        q = q.eq('type', type);
      }

      const { data, error } = await q;
      if (error) throw error;

      // 월별 집계
      const monthMap = new Map<number, { msp: number; tt: number; dev: number }>();
      for (let m = 1; m <= 12; m++) {
        monthMap.set(m, { msp: 0, tt: 0, dev: 0 });
      }

      (data ?? []).forEach((c) => {
        const month = new Date(c.created_at).getMonth() + 1;
        const entry = monthMap.get(month);
        if (!entry) return;
        const amount = c.total_amount ?? 0;
        if (c.type === 'msp') entry.msp += amount;
        else if (c.type === 'tt') entry.tt += amount;
        else if (c.type === 'dev') entry.dev += amount;
      });

      return Array.from(monthMap.entries()).map(([month, vals]) => ({
        month,
        ...vals,
        total: vals.msp + vals.tt + vals.dev,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useTeamRevenue(year: number, quarter?: number) {
  return useQuery({
    queryKey: ['team-revenue', year, quarter],
    queryFn: async (): Promise<TeamRevenueResult> => {
      const supabase = createClient();

      // 분기 날짜 범위
      let dateFrom = `${year}-01-01`;
      let dateTo = `${year + 1}-01-01`;
      if (quarter) {
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = startMonth + 3;
        dateFrom = `${year}-${String(startMonth).padStart(2, '0')}-01`;
        dateTo = endMonth > 12
          ? `${year + 1}-01-01`
          : `${year}-${String(endMonth).padStart(2, '0')}-01`;
      }

      // 팀별 배분 매출
      const { data: teamData, error: teamError } = await supabase
        .from('contract_teams')
        .select('team_id, percentage, contracts!contract_teams_contract_id_fkey(total_amount, created_at, deleted_at), teams!contract_teams_team_id_fkey(name)')
        .is('deleted_at', null);
      if (teamError) throw teamError;

      const teamMap = new Map<string, { name: string; revenue: number }>();

      (teamData ?? []).forEach((ct) => {
        const contract = ct.contracts as { total_amount: number | null; created_at: string; deleted_at: string | null } | null;
        if (!contract || contract.deleted_at) return;
        if (contract.created_at < dateFrom || contract.created_at >= dateTo) return;

        const teamName = (ct.teams as { name: string } | null)?.name ?? '알 수 없음';
        const revenue = (contract.total_amount ?? 0) * (ct.percentage ?? 0) / 100;

        const existing = teamMap.get(ct.team_id) ?? { name: teamName, revenue: 0 };
        existing.revenue += revenue;
        teamMap.set(ct.team_id, existing);
      });

      // 미배분 매출
      const { data: allContracts } = await supabase
        .from('contracts')
        .select('id, total_amount')
        .is('deleted_at', null)
        .gte('created_at', dateFrom)
        .lt('created_at', dateTo);

      const { data: allocatedIds } = await supabase
        .from('contract_teams')
        .select('contract_id')
        .is('deleted_at', null);

      const allocatedSet = new Set((allocatedIds ?? []).map((a) => a.contract_id));
      const unallocated = (allContracts ?? [])
        .filter((c) => !allocatedSet.has(c.id))
        .reduce((sum, c) => sum + (c.total_amount ?? 0), 0);

      const teams = Array.from(teamMap.entries())
        .map(([teamId, { name, revenue }]) => ({ teamId, teamName: name, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      return { teams, unallocated };
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 커밋**

```
feat(revenue): 매출 데이터 훅 + 색상 상수 추가
```

---

### Task 2: 월별 매출 차트 컴포넌트

**Files:**
- Create: `src/components/revenue/monthly-revenue-chart.tsx`

- [ ] **Step 1: MonthlyRevenueChart 컴포넌트 생성**

```typescript
'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { REVENUE_COLORS } from '@/lib/constants';
import { formatAmount } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

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
  typeFilter: string;
  showYoY: boolean;
}

const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[13px] font-semibold text-zinc-900">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="text-[12px] text-zinc-600">
          <span style={{ color: p.fill }}>{p.name}</span>: {formatAmount(p.value)}
        </p>
      ))}
    </div>
  );
}

export function MonthlyRevenueChart({ data, prevYearData, loading, typeFilter, showYoY }: MonthlyRevenueChartProps) {
  if (loading) return <Skeleton className="h-[300px] w-full rounded-xl" />;

  const chartData = data.map((d, i) => ({
    name: MONTH_LABELS[i],
    ...(typeFilter === 'all' ? { MSP: d.msp, 교육: d.tt, 개발: d.dev } : { 매출: d.total }),
    ...(showYoY && prevYearData?.[i] ? (
      typeFilter === 'all'
        ? { '전년 MSP': prevYearData[i].msp, '전년 교육': prevYearData[i].tt, '전년 개발': prevYearData[i].dev }
        : { '전년 매출': prevYearData[i].total }
    ) : {}),
  }));

  return (
    <div className="rounded-xl bg-zinc-50 p-5">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} barGap={showYoY ? 2 : 0} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} />
          <YAxis tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(v) => `${Math.round(v / 10000)}만`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          {typeFilter === 'all' ? (
            <>
              {showYoY && prevYearData && (
                <>
                  <Bar dataKey="전년 MSP" fill={REVENUE_COLORS.msp} opacity={0.3} radius={[2,2,0,0]} />
                  <Bar dataKey="전년 교육" fill={REVENUE_COLORS.tt} opacity={0.3} radius={[2,2,0,0]} />
                  <Bar dataKey="전년 개발" fill={REVENUE_COLORS.dev} opacity={0.3} radius={[2,2,0,0]} />
                </>
              )}
              <Bar dataKey="MSP" stackId="current" fill={REVENUE_COLORS.msp} radius={[2,2,0,0]} />
              <Bar dataKey="교육" stackId="current" fill={REVENUE_COLORS.tt} radius={[2,2,0,0]} />
              <Bar dataKey="개발" stackId="current" fill={REVENUE_COLORS.dev} radius={[2,2,0,0]} />
            </>
          ) : (
            <>
              {showYoY && prevYearData && (
                <Bar dataKey="전년 매출" fill={typeFilter === 'msp' ? REVENUE_COLORS.msp : typeFilter === 'tt' ? REVENUE_COLORS.tt : REVENUE_COLORS.dev} opacity={0.3} radius={[2,2,0,0]} />
              )}
              <Bar dataKey="매출" fill={typeFilter === 'msp' ? REVENUE_COLORS.msp : typeFilter === 'tt' ? REVENUE_COLORS.tt : REVENUE_COLORS.dev} radius={[4,4,0,0]} />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 커밋**

```
feat(revenue): 월별 매출 Recharts 차트 컴포넌트
```

---

### Task 3: 분기별 합계 카드

**Files:**
- Create: `src/components/revenue/quarterly-summary.tsx`

- [ ] **Step 1: QuarterlySummary 컴포넌트 생성**

```typescript
'use client';

import { formatAmount } from '@/lib/utils';

interface MonthlyData {
  month: number;
  total: number;
}

interface QuarterlySummaryProps {
  data: MonthlyData[];
}

export function QuarterlySummary({ data }: QuarterlySummaryProps) {
  const quarters = [
    { label: '1분기', months: [1, 2, 3] },
    { label: '2분기', months: [4, 5, 6] },
    { label: '3분기', months: [7, 8, 9] },
    { label: '4분기', months: [10, 11, 12] },
  ];

  const quarterTotals = quarters.map((q) => ({
    label: q.label,
    total: data.filter((d) => q.months.includes(d.month)).reduce((sum, d) => sum + d.total, 0),
  }));

  const yearTotal = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="flex gap-4">
      {quarterTotals.map((q) => (
        <div key={q.label} className="flex-1 rounded-xl border border-zinc-200 p-4 space-y-1">
          <p className="text-xs font-medium text-zinc-500">{q.label}</p>
          <p className="text-lg font-bold text-zinc-900">{formatAmount(q.total)}</p>
        </div>
      ))}
      <div className="flex-1 rounded-xl border border-blue-600 bg-blue-50 p-4 space-y-1">
        <p className="text-xs font-medium text-blue-600">연간 합계</p>
        <p className="text-lg font-bold text-blue-600">{formatAmount(yearTotal)}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```
feat(revenue): 분기별 합계 카드 컴포넌트
```

---

### Task 4: 팀별 매출 차트 + 순위 테이블

**Files:**
- Create: `src/components/revenue/team-revenue-chart.tsx`
- Create: `src/components/revenue/team-ranking-table.tsx`

- [ ] **Step 1: TeamRevenueChart 생성**

```typescript
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatAmount } from '@/lib/utils';
import { REVENUE_COLORS } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';

interface TeamData {
  teamName: string;
  revenue: number;
}

interface TeamRevenueChartProps {
  teams: TeamData[];
  unallocated: number;
  loading?: boolean;
}

const TEAM_COLORS: Record<string, string> = {
  'MSP팀': REVENUE_COLORS.msp,
  '교육팀': REVENUE_COLORS.tt,
  '개발팀': REVENUE_COLORS.dev,
};

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { value: number; payload: { name: string } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[13px] font-semibold text-zinc-900">{d.payload.name}</p>
      <p className="text-[12px] text-zinc-600">{formatAmount(d.value)}</p>
    </div>
  );
}

export function TeamRevenueChart({ teams, unallocated, loading }: TeamRevenueChartProps) {
  if (loading) return <Skeleton className="h-full w-full rounded-xl" />;

  const chartData = [
    ...teams.map((t) => ({ name: t.teamName, 매출: t.revenue, fill: TEAM_COLORS[t.teamName] ?? '#a1a1aa' })),
    ...(unallocated > 0 ? [{ name: '미배분', 매출: unallocated, fill: REVENUE_COLORS.unallocated }] : []),
  ];

  return (
    <div className="rounded-xl border border-zinc-200 p-5 h-full">
      <p className="text-base font-semibold text-zinc-900 mb-4">팀별 매출 비교</p>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={chartData} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#71717a' }} />
          <YAxis tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(v) => `${Math.round(v / 10000)}만`} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="매출" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, i) => (
              <rect key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 2: TeamRankingTable 생성**

```typescript
'use client';

import { formatAmount } from '@/lib/utils';
import { REVENUE_COLORS } from '@/lib/constants';

interface TeamData {
  teamName: string;
  revenue: number;
}

interface TeamRankingTableProps {
  teams: TeamData[];
  unallocated: number;
}

const TEAM_COLORS: Record<string, string> = {
  'MSP팀': REVENUE_COLORS.msp,
  '교육팀': REVENUE_COLORS.tt,
  '개발팀': REVENUE_COLORS.dev,
};

export function TeamRankingTable({ teams, unallocated }: TeamRankingTableProps) {
  return (
    <div className="rounded-xl border border-zinc-200 p-5 h-full">
      <p className="text-base font-semibold text-zinc-900 mb-4">팀별 매출 순위</p>
      <div className="space-y-0">
        {teams.map((t, i) => (
          <div key={t.teamName} className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: TEAM_COLORS[t.teamName] ?? '#a1a1aa' }}
              >
                {i + 1}
              </div>
              <span className="text-sm font-medium text-zinc-900">{t.teamName}</span>
            </div>
            <span className="text-sm font-bold text-zinc-900">{formatAmount(t.revenue)}</span>
          </div>
        ))}
        {unallocated > 0 && (
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-bold text-zinc-500">
                -
              </div>
              <span className="text-sm font-medium text-zinc-400">미배분</span>
            </div>
            <span className="text-sm font-bold text-zinc-400">{formatAmount(unallocated)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 커밋**

```
feat(revenue): 팀별 매출 차트 + 순위 테이블 컴포넌트
```

---

### Task 5: 매출 분석 페이지 조립

**Files:**
- Create: `src/app/(authenticated)/revenue/page.tsx`

- [ ] **Step 1: revenue 페이지 생성**

```typescript
'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { canAccessFeature } from '@/lib/auth/permissions';
import { useMonthlyRevenue, useTeamRevenue } from '@/hooks/use-revenue';
import { MonthlyRevenueChart } from '@/components/revenue/monthly-revenue-chart';
import { QuarterlySummary } from '@/components/revenue/quarterly-summary';
import { TeamRevenueChart } from '@/components/revenue/team-revenue-chart';
import { TeamRankingTable } from '@/components/revenue/team-ranking-table';
import { ErrorState } from '@/components/common/error-state';
import { ChevronDown, GitCompare } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const TYPE_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'msp', label: 'MSP' },
  { value: 'tt', label: '교육' },
  { value: 'dev', label: '개발' },
] as const;
const QUARTER_FILTERS = [
  { value: 0, label: '전체' },
  { value: 1, label: '1분기' },
  { value: 2, label: '2분기' },
  { value: 3, label: '3분기' },
  { value: 4, label: '4분기' },
] as const;

function RevenuePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: currentUser } = useCurrentUser();

  const tab = searchParams.get('tab') ?? 'annual';
  const [year, setYear] = useState(CURRENT_YEAR);
  const [typeFilter, setTypeFilter] = useState('all');
  const [quarter, setQuarter] = useState(0);
  const [showYoY, setShowYoY] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  // 권한 체크
  if (currentUser && !canAccessFeature('revenue_team', currentUser.role)) {
    return <ErrorState message="매출 분석에 접근할 수 없습니다" />;
  }

  const isFullAccess = currentUser ? canAccessFeature('revenue_all', currentUser.role) : false;

  // 데이터 훅
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyRevenue(year, typeFilter === 'all' ? undefined : typeFilter);
  const { data: prevYearData } = useMonthlyRevenue(year - 1, typeFilter === 'all' ? undefined : typeFilter);
  const { data: teamData, isLoading: teamLoading } = useTeamRevenue(year, quarter || undefined);

  function setTab(t: string) {
    router.replace(`/revenue?tab=${t}`, { scroll: false });
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <h1 className="text-2xl font-semibold text-zinc-900">매출 분석</h1>

      {/* 탭 */}
      <div className="flex border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setTab('annual')}
          className={cn(
            'h-10 px-4 text-[14px] font-medium transition-colors',
            tab === 'annual' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-zinc-500 hover:text-zinc-700',
          )}
        >
          연간 현황
        </button>
        <button
          type="button"
          onClick={() => setTab('team')}
          className={cn(
            'h-10 px-4 text-[14px] font-medium transition-colors',
            tab === 'team' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-zinc-500 hover:text-zinc-700',
          )}
        >
          팀별 분석
        </button>
      </div>

      {/* 연간 현황 */}
      {tab === 'annual' && (
        <div className="space-y-6">
          {/* 필터 행 */}
          <div className="flex items-center gap-2">
            {/* 연도 드롭다운 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setYearOpen(!yearOpen)}
                className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-3 text-[13px] font-medium text-zinc-900"
              >
                {year} <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>
              {yearOpen && (
                <div className="absolute left-0 top-9 z-10 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => { setYear(y); setYearOpen(false); }}
                      className={cn('block w-full px-4 py-1.5 text-left text-[13px]', y === year ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-zinc-600 hover:bg-zinc-50')}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 타입 필터 */}
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  'h-8 rounded-md px-3 text-[13px] font-medium transition-colors',
                  typeFilter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50',
                )}
              >
                {f.label}
              </button>
            ))}

            <div className="flex-1" />

            {/* 전년 비교 */}
            <button
              type="button"
              onClick={() => setShowYoY(!showYoY)}
              disabled={!prevYearData?.some((d) => d.total > 0)}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
                showYoY
                  ? 'bg-blue-50 text-blue-600 border border-blue-600'
                  : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              <GitCompare className="h-3.5 w-3.5" />
              전년 비교
            </button>
          </div>

          {/* 차트 */}
          <MonthlyRevenueChart
            data={monthlyData ?? []}
            prevYearData={showYoY ? prevYearData ?? undefined : undefined}
            loading={monthlyLoading}
            typeFilter={typeFilter}
            showYoY={showYoY}
          />

          {/* 분기별 합계 */}
          {monthlyData && <QuarterlySummary data={monthlyData} />}
        </div>
      )}

      {/* 팀별 분석 */}
      {tab === 'team' && (
        <div className="space-y-6">
          {/* 필터 행 */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setYearOpen(!yearOpen)}
                className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 px-3 text-[13px] font-medium text-zinc-900"
              >
                {year} <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>
              {yearOpen && (
                <div className="absolute left-0 top-9 z-10 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  {YEARS.map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => { setYear(y); setYearOpen(false); }}
                      className={cn('block w-full px-4 py-1.5 text-left text-[13px]', y === year ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-zinc-600 hover:bg-zinc-50')}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {QUARTER_FILTERS.map((q) => (
              <button
                key={q.value}
                type="button"
                onClick={() => setQuarter(q.value)}
                className={cn(
                  'h-8 rounded-md px-3 text-[13px] font-medium transition-colors',
                  quarter === q.value
                    ? 'bg-blue-600 text-white'
                    : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50',
                )}
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* 차트 + 순위 */}
          <div className="flex gap-6" style={{ minHeight: 360 }}>
            <div className="flex-1">
              <TeamRevenueChart
                teams={isFullAccess ? (teamData?.teams ?? []) : (teamData?.teams ?? []).filter((t) => t.teamName === (currentUser?.teamType === 'msp' ? 'MSP팀' : currentUser?.teamType === 'education' ? '교육팀' : '개발팀'))}
                unallocated={isFullAccess ? (teamData?.unallocated ?? 0) : 0}
                loading={teamLoading}
              />
            </div>
            <div className="w-[340px]">
              <TeamRankingTable
                teams={isFullAccess ? (teamData?.teams ?? []) : (teamData?.teams ?? []).filter((t) => t.teamName === (currentUser?.teamType === 'msp' ? 'MSP팀' : currentUser?.teamType === 'education' ? '교육팀' : '개발팀'))}
                unallocated={isFullAccess ? (teamData?.unallocated ?? 0) : 0}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RevenuePage() {
  return (
    <Suspense fallback={null}>
      <RevenuePageInner />
    </Suspense>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 브라우저에서 /revenue 접속 확인**

- 연간 현황 탭: 월별 차트 + 분기 카드
- 타입 필터 전환 (전체/MSP/교육/개발)
- 전년 비교 토글
- 팀별 분석 탭: 차트 + 순위 테이블
- 분기 필터 전환

- [ ] **Step 4: 커밋**

```
feat(revenue): 매출 분석 페이지 (연간 현황 + 팀별 분석)
```

---

### Task 6: 사이드바 권한 + staff 접근 차단

**Files:**
- Modify: `src/lib/auth/permissions.ts` (이미 `revenue_team`, `revenue_all` 있음)

- [ ] **Step 1: staff 접근 차단 확인**

기존 `canAccessSection`에서 `nxt` 섹션은 admin/c_level만 접근 가능하고, 사이드바에 `/revenue`가 nxt 섹션에 포함되어 있으므로 staff는 이미 사이드바에서 보이지 않음.

team_lead가 nxt 섹션에 접근할 수 없는 문제가 있음. `/revenue`를 team_lead도 접근할 수 있도록 사이드바를 수정해야 함.

`src/lib/constants.ts`의 SIDEBAR_SECTIONS에서 매출 분석 항목을 team_lead도 볼 수 있도록 확인:

현재 nxt 섹션의 `allowedRoles`가 `['admin', 'c_level']`이므로 team_lead는 접근 불가. 매출 분석만 team_lead에게 보이려면 별도 처리가 필요.

방법: team_lead에게는 매출 분석 링크만 보이도록 사이드바에 조건부 표시 추가.

`src/lib/constants.ts`에서 매출 분석 항목에 `roles` 필드를 추가:

기존:
```
{ href: '/revenue', label: '매출 분석', icon: 'trending-up' },
```

수정: 사이드바 아이템에 `roles` 필드 추가하고, sidebar에서 필터링.

- [ ] **Step 2: constants.ts 수정 — 아이템별 roles 추가**

SIDEBAR_SECTIONS의 아이템 타입에 `roles?: UserRole[]` 추가. `/revenue` 항목에 `roles: ['team_lead', 'admin', 'c_level']` 추가.

```typescript
// 기존 items 배열의 revenue 항목을:
{ href: '/revenue', label: '매출 분석', icon: 'trending-up', roles: ['team_lead', 'admin', 'c_level'] },
```

- [ ] **Step 3: sidebar-section.tsx에서 아이템별 roles 필터링**

`SidebarSection` 컴포넌트에서 `item.roles`가 있으면 현재 사용자 role 체크:

```typescript
// items를 렌더링할 때:
const filteredItems = items.filter((item) => !item.roles || item.roles.includes(currentUser.role));
```

- [ ] **Step 4: team_lead로 로그인하여 /revenue 접근 확인**

- team_lead: 매출 분석 사이드바에 표시됨, 소속 팀만 보임
- staff: 매출 분석 사이드바에 안 보임, 직접 URL 접근 시 에러 표시
- admin/c_level: 전사 데이터 보임

- [ ] **Step 5: 커밋**

```
feat(revenue): 매출 분석 접근 권한 (staff 차단, team_lead 소속 팀)
```

---

### Task 7: 최종 확인 + progress.md 업데이트

- [ ] **Step 1: 전체 타입 체크**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: progress.md 업데이트**

매출 분석 완료 항목 추가.

- [ ] **Step 3: 최종 커밋**

```
docs: progress.md 매출 분석 완료 반영
```

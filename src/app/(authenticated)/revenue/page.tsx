'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, GitCompare } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useMonthlyRevenue, useTeamRevenue } from '@/hooks/use-revenue';
import { canAccessFeature } from '@/lib/auth/permissions';
import { ErrorState } from '@/components/common/error-state';
import { MonthlyRevenueChart } from '@/components/revenue/monthly-revenue-chart';
import { QuarterlySummary } from '@/components/revenue/quarterly-summary';
import { TeamRevenueChart } from '@/components/revenue/team-revenue-chart';
import { TeamRankingTable } from '@/components/revenue/team-ranking-table';
import { cn } from '@/lib/utils';
import { useSearchParams, useRouter } from 'next/navigation';
import type { TeamType } from '@/lib/constants';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 9 }, (_, i) => CURRENT_YEAR - 4 + i);

const TYPE_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'msp', label: 'MSP' },
  { value: 'tt', label: '교육' },
  { value: 'dev', label: '개발' },
] as const;

const QUARTER_FILTERS = [
  { value: undefined, label: '전체' },
  { value: 1, label: '1분기' },
  { value: 2, label: '2분기' },
  { value: 3, label: '3분기' },
  { value: 4, label: '4분기' },
] as const;

const TEAM_TYPE_TO_NAME: Record<string, string> = {
  msp: 'MSP팀',
  education: '교육팀',
  dev: '개발팀',
};

// --- Year Dropdown ---

function YearDropdown({
  value,
  onChange,
}: {
  value: number;
  onChange: (year: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
      >
        {value}년
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-52 w-28 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
          {YEAR_OPTIONS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => {
                onChange(y);
                setOpen(false);
              }}
              className={cn(
                'block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-zinc-100',
                y === value
                  ? 'font-semibold text-blue-600'
                  : 'text-zinc-700',
              )}
            >
              {y}년
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Tab Button ---

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-lg px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-blue-600 text-white'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
      )}
    >
      {children}
    </button>
  );
}

// --- Filter Button ---

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-blue-600 text-white'
          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
      )}
    >
      {children}
    </button>
  );
}

// --- Annual Tab ---

function AnnualTab({ year }: { year: number }) {
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showYoY, setShowYoY] = useState(false);

  const typeParam = typeFilter === 'all' ? undefined : (typeFilter as 'msp' | 'tt' | 'dev');
  const { data: currentData, isLoading } = useMonthlyRevenue(year, typeParam);
  const { data: prevData, isLoading: prevLoading } = useMonthlyRevenue(year - 1, typeParam);

  const hasPrevData = prevData && prevData.some((d) => d.total > 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Filter Row */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <FilterButton
              key={f.value}
              active={typeFilter === f.value}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </FilterButton>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowYoY((prev) => !prev)}
            disabled={!hasPrevData}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
              showYoY && hasPrevData
                ? 'bg-blue-50 text-blue-600'
                : 'bg-zinc-100 text-zinc-400',
              !hasPrevData && 'cursor-not-allowed opacity-50',
            )}
          >
            <GitCompare className="h-3.5 w-3.5" />
            전년 비교
          </button>
        </div>
      </div>

      {/* Chart */}
      <MonthlyRevenueChart
        data={currentData ?? []}
        prevYearData={showYoY ? prevData : undefined}
        loading={isLoading || (showYoY && prevLoading)}
        typeFilter={typeFilter}
        showYoY={showYoY && !!hasPrevData}
      />

      {/* Quarterly Summary */}
      {currentData && <QuarterlySummary data={currentData} />}
    </div>
  );
}

// --- Team Tab ---

function TeamTab({
  year,
  isFullAccess,
  teamType,
}: {
  year: number;
  isFullAccess: boolean;
  teamType: TeamType | null;
}) {
  const [quarter, setQuarter] = useState<1 | 2 | 3 | 4 | undefined>(undefined);

  const { data, isLoading } = useTeamRevenue(year, quarter);

  // team_lead: 자기 팀만 표시
  const filteredTeams = (() => {
    if (!data) return [];
    if (isFullAccess) return data.teams;
    const myTeamName = teamType ? TEAM_TYPE_TO_NAME[teamType] : null;
    if (!myTeamName) return [];
    return data.teams.filter((t) => t.teamName === myTeamName);
  })();

  const unallocated = isFullAccess ? (data?.unallocated ?? 0) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Filter Row */}
      <div className="flex items-center gap-1.5">
        {QUARTER_FILTERS.map((f) => (
          <FilterButton
            key={f.label}
            active={quarter === f.value}
            onClick={() => setQuarter(f.value as 1 | 2 | 3 | 4 | undefined)}
          >
            {f.label}
          </FilterButton>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-4" style={{ minHeight: 360 }}>
        <div className="flex-1">
          <TeamRevenueChart
            teams={filteredTeams}
            unallocated={unallocated}
            loading={isLoading}
          />
        </div>
        <div className="w-[340px]">
          <TeamRankingTable
            teams={filteredTeams}
            unallocated={unallocated}
          />
        </div>
      </div>
    </div>
  );
}

// --- Inner Page ---

function RevenuePageInner() {
  const { data: currentUser, isLoading: userLoading } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTab = searchParams.get('tab') ?? 'annual';
  const [year, setYear] = useState(CURRENT_YEAR);

  const setTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`/revenue?${params.toString()}`);
    },
    [router, searchParams],
  );

  if (userLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100" />
        <div className="h-[400px] animate-pulse rounded-xl bg-zinc-50" />
      </div>
    );
  }

  if (!currentUser) return null;

  // Access control
  if (!canAccessFeature('revenue_team', currentUser.role)) {
    return <ErrorState message="매출 분석에 접근할 수 없습니다" />;
  }

  const isFullAccess = canAccessFeature('revenue_all', currentUser.role);

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900">매출 분석</h1>
          <p className="text-sm text-zinc-500">
            {isFullAccess ? '전사 매출 현황을 분석합니다' : '팀 매출 현황을 분석합니다'}
          </p>
        </div>
      </div>

      {/* Tabs + Year Filter */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          <TabButton active={activeTab === 'annual'} onClick={() => setTab('annual')}>
            연간 현황
          </TabButton>
          <TabButton active={activeTab === 'team'} onClick={() => setTab('team')}>
            팀별 분석
          </TabButton>
        </div>
        <YearDropdown value={year} onChange={setYear} />
      </div>

      {/* Tab Content */}
      {activeTab === 'annual' ? (
        <AnnualTab year={year} />
      ) : (
        <TeamTab year={year} isFullAccess={isFullAccess} teamType={currentUser.teamType} />
      )}
    </div>
  );
}

// --- Default Export with Suspense ---

export default function RevenuePage() {
  return (
    <Suspense fallback={null}>
      <RevenuePageInner />
    </Suspense>
  );
}

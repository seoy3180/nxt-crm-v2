'use client';

import { useDashboardStats, usePipeline, useMonthlyRevenue, useTeamRevenue, useRecentActivity } from '@/hooks/use-dashboard';
import { KpiCard } from '@/components/common/kpi-card';
import { formatRevenue, formatTimeAgo } from '@/lib/utils';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';

function getStageLabel(stage: string) {
  const all = [...MSP_STAGES, ...EDU_STAGES];
  return all.find((s) => s.value === stage)?.label ?? stage;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: mspPipeline } = usePipeline('msp');
  const { data: ttPipeline } = usePipeline('tt');
  const { data: monthlyRevenue } = useMonthlyRevenue();
  const { data: teamRevenue } = useTeamRevenue();
  const { data: activity } = useRecentActivity();

  if (statsLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900">대시보드</h1>
          <p className="text-sm text-zinc-500">전사 현황을 한눈에 확인하세요</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
          ))}
        </div>
        <div className="flex flex-1 gap-4">
          <div className="flex-1 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
          <div className="w-80 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden">
      {/* 헤더 */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-zinc-900">대시보드</h1>
        <p className="text-sm text-zinc-500">전사 현황을 한눈에 확인하세요</p>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="총 매출"
          value={stats?.totalRevenue ? formatRevenue(stats.totalRevenue) : '-'}
          change="전체 계약 금액 합산"
          changeColor="text-green-500"
        />
        <KpiCard
          label="총 고객 수"
          value={String(stats?.totalClients ?? '-')}
          change="전체 등록 고객"
          changeColor="text-zinc-400"
        />
        <KpiCard
          label="활성 계약"
          value={String(stats?.activeContracts ?? '-')}
          change={`MSP ${stats?.mspContracts ?? 0} · 교육 ${stats?.ttContracts ?? 0}`}
        />
        <KpiCard
          label="신규 고객"
          value="-"
          change="이번 달"
        />
      </div>

      {/* 하단 */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* 왼쪽 */}
        <div className="flex flex-1 flex-col gap-4">
          {/* 월별 매출 차트 */}
          <div className="flex flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold text-zinc-900">월별 매출 추이</span>
              {monthlyRevenue && (
                <span className="text-xs text-zinc-400">{monthlyRevenue.length}개월</span>
              )}
            </div>
            {monthlyRevenue && monthlyRevenue.length > 0 ? (
              <div className="flex flex-1 items-end gap-3 pt-2">
                {(() => {
                  const maxAmount = Math.max(...monthlyRevenue.map((r) => r.amount), 1);
                  return monthlyRevenue.map((m) => {
                  const pct = (m.amount / maxAmount) * 100;
                  const monthNum = m.month.slice(5);
                  return (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="text-[10px] font-medium text-zinc-500">{formatRevenue(m.amount)}</span>
                      <div className="flex w-full justify-center">
                        <div
                          className="w-full max-w-[40px] rounded-t bg-blue-500"
                          style={{ height: Math.max(pct * 2.5, 8) }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400">{parseInt(monthNum)}월</span>
                    </div>
                  );
                });
                })()}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">데이터 없음</div>
            )}
          </div>

          {/* 파이프라인 (전폭) */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <span className="text-[13px] font-semibold text-zinc-900">파이프라인 요약</span>
            <div className="mt-3 flex gap-6">
              {/* MSP */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">MSP</span>
                  <span className="text-[11px] text-zinc-400">{(mspPipeline ?? []).reduce((s, d) => s + d.count, 0)}건</span>
                </div>
                <div className="flex gap-1">
                  {MSP_STAGES.map((s) => {
                    const count = (mspPipeline ?? []).find((d) => d.stage === s.value)?.count ?? 0;
                    return (
                      <div key={s.value} className="flex-1">
                        <div className={`flex h-6 items-center justify-center rounded text-[10px] font-semibold ${count > 0 ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                          {count}
                        </div>
                        <p className="mt-0.5 text-center text-[9px] text-zinc-400">{s.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* 교육 */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">교육</span>
                  <span className="text-[11px] text-zinc-400">{(ttPipeline ?? []).reduce((s, d) => s + d.count, 0)}건</span>
                </div>
                <div className="flex gap-1">
                  {EDU_STAGES.map((s) => {
                    const count = (ttPipeline ?? []).find((d) => d.stage === s.value)?.count ?? 0;
                    return (
                      <div key={s.value} className="flex-1">
                        <div className={`flex h-6 items-center justify-center rounded text-[10px] font-semibold ${count > 0 ? 'bg-amber-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                          {count}
                        </div>
                        <p className="mt-0.5 text-center text-[9px] text-zinc-400">{s.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* 개발 */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">개발</span>
                  <span className="text-[11px] text-zinc-400">준비 중</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex-1">
                      <div className="flex h-6 items-center justify-center rounded bg-zinc-100">
                        {i === 2 && <span className="text-[10px] text-zinc-300">준비 중</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 팀별 매출 + 최근 활동 */}
        <div className="flex w-80 flex-col gap-4">
          {/* 팀별 매출 */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <span className="text-[13px] font-semibold text-zinc-900">팀별 매출 비중</span>
            {teamRevenue && teamRevenue.length > 0 ? (
              (() => {
                const total = teamRevenue.reduce((s, r) => s + r.amount, 0);
                const colors = ['bg-blue-500', 'bg-amber-500', 'bg-zinc-400'];
                return (
                  <div className="mt-3 space-y-3">
                    <div className="flex h-6 overflow-hidden rounded-lg">
                      {teamRevenue.map((t, i) => {
                        const pct = total > 0 ? (t.amount / total) * 100 : 0;
                        return <div key={t.team} className={`${colors[i] ?? 'bg-zinc-300'}`} style={{ width: `${pct}%` }} />;
                      })}
                    </div>
                    <div className="space-y-1.5">
                      {teamRevenue.map((t, i) => {
                        const pct = total > 0 ? Math.round((t.amount / total) * 100) : 0;
                        return (
                          <div key={t.team} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`h-2.5 w-2.5 rounded-full ${colors[i] ?? 'bg-zinc-300'}`} />
                              <span className="text-xs font-medium text-zinc-900">{t.team}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-zinc-400">{formatRevenue(t.amount)}</span>
                              <span className="text-xs font-semibold text-blue-600">{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="mt-3 text-center text-sm text-zinc-400">데이터 없음</div>
            )}
          </div>

          {/* 최근 활동 */}
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="mb-3 text-base font-semibold text-zinc-900">최근 활동</h3>
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {(!activity || activity.length === 0) ? (
              <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
                <span className="text-sm">활동 이력이 없습니다</span>
              </div>
            ) : (
              activity.map((item) => (
                <div key={item.id} className="space-y-0.5 border-b border-zinc-100 pb-2.5 last:border-0">
                  <p className="text-[13px] font-medium text-zinc-900">{item.contractName}</p>
                  <p className="text-xs text-blue-600">
                    {item.fromStage ? `${getStageLabel(item.fromStage)} → ` : ''}{getStageLabel(item.toStage)}
                  </p>
                  <p className="text-[11px] text-zinc-400">{item.changedBy} · {formatTimeAgo(item.createdAt)}</p>
                </div>
              ))
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

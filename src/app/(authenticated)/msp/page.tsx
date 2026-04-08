'use client';

import Link from 'next/link';
import { useMspStats, useMspGradeDistribution, useMspPipeline, useMspMonthlyRevenue, useMspRecentActivity } from '@/hooks/use-msp-dashboard';
import { KpiCard } from '@/components/common/kpi-card';
import { formatRevenue, formatTimeAgo } from '@/lib/utils';
import { MSP_STAGES } from '@/lib/constants';
import { FileText, Users, Search as SearchIcon } from 'lucide-react';

function getStageLabel(stage: string) {
  return MSP_STAGES.find((s) => s.value === stage)?.label ?? stage;
}

export default function MspDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useMspStats();
  const { data: gradeDistribution } = useMspGradeDistribution();
  const { data: pipeline, isLoading: pipelineLoading } = useMspPipeline();
  const { data: monthlyRevenue, isLoading: revenueLoading } = useMspMonthlyRevenue();
  const { data: activity, isLoading: activityLoading } = useMspRecentActivity();

  const isLoading = statsLoading || pipelineLoading || revenueLoading || activityLoading;

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900">MSP 대시보드</h1>
          <p className="text-sm text-zinc-500">MSP팀 현황을 확인하세요</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-[110px] animate-pulse rounded-xl border border-zinc-200 bg-zinc-50" />)}
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
        <h1 className="text-2xl font-semibold text-zinc-900">MSP 대시보드</h1>
        <p className="text-sm text-zinc-500">MSP팀 현황을 확인하세요</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="MSP 매출" value={stats?.revenue ? formatRevenue(stats.revenue) : '-'} change="MSP 계약 합산" changeColor="text-green-500" />
        <KpiCard label="MSP 고객" value={String(stats?.clients ?? '-')} change="MSP 비즈니스 고객" changeColor="text-zinc-400" />
        <KpiCard label="MSP 계약" value={String(stats?.contracts ?? '-')} change="전체 MSP 계약" changeColor="text-zinc-400" />
      </div>

      {/* 하단 */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* 왼쪽 */}
        <div className="flex flex-1 flex-col gap-4">
          {/* 월별 매출 차트 */}
          <div className="flex flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-base font-semibold text-zinc-900">월별 MSP 매출 추이</span>
              {monthlyRevenue && <span className="text-xs text-zinc-400">{monthlyRevenue.length}개월</span>}
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
                          <div className="w-full max-w-[40px] rounded-t bg-blue-500" style={{ height: Math.max(pct * 2.5, 8) }} />
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

          {/* 등급별 분포 + 파이프라인 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 등급별 분포 */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <span className="text-[13px] font-semibold text-zinc-900">등급별 분포</span>
              {gradeDistribution && gradeDistribution.length > 0 ? (
                <div className="mt-3 flex gap-1">
                  {(() => {
                    const gradeOrder = ['None', 'FREE', 'MSP5', 'MSP10', 'MSP15', 'MSP20', 'MSP25', 'MSP30', 'MSP50', 'MSP100'];
                    const sorted = [...gradeDistribution].sort((a, b) => {
                      const ai = gradeOrder.indexOf(a.grade);
                      const bi = gradeOrder.indexOf(b.grade);
                      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                    });
                    const gradeColors: Record<string, string> = {
                      'None': 'bg-zinc-300 text-white',
                      'FREE': 'bg-emerald-400 text-white',
                      'MSP5': 'bg-emerald-500 text-white',
                      'MSP10': 'bg-teal-500 text-white',
                      'MSP15': 'bg-teal-600 text-white',
                      'MSP20': 'bg-cyan-600 text-white',
                      'MSP25': 'bg-cyan-700 text-white',
                      'MSP30': 'bg-indigo-500 text-white',
                      'MSP50': 'bg-indigo-600 text-white',
                      'MSP100': 'bg-violet-600 text-white',
                    };
                    return sorted.map((g) => (
                      <div key={g.grade} className="flex-1">
                        <div className={`flex h-7 items-center justify-center rounded text-[11px] font-semibold ${g.count > 0 ? (gradeColors[g.grade] ?? 'bg-zinc-400 text-white') : 'bg-zinc-100 text-zinc-400'}`}>
                          {g.count}
                        </div>
                        <p className="mt-1 text-center text-[9px] text-zinc-400">{g.grade}</p>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">데이터 없음</p>
              )}
            </div>

            {/* 파이프라인 */}
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
              <span className="text-[13px] font-semibold text-zinc-900">파이프라인 현황</span>
              <div className="mt-3 flex gap-1">
                {MSP_STAGES.map((s) => {
                  const count = (pipeline ?? []).find((d) => d.stage === s.value)?.count ?? 0;
                  return (
                    <div key={s.value} className="flex-1">
                      <div className={`flex h-7 items-center justify-center rounded text-[11px] font-semibold ${count > 0 ? 'bg-blue-500 text-white' : 'bg-zinc-100 text-zinc-400'}`}>
                        {count}
                      </div>
                      <p className="mt-1 text-center text-[9px] text-zinc-400">{s.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 */}
        <div className="flex w-80 flex-col gap-4">
          {/* 빠른 작업 */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <span className="text-base font-semibold text-zinc-900">빠른 작업</span>
            <div className="mt-3 space-y-1.5">
              <Link href="/msp/contracts/new" className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-50">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50">
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                </span>
                <span className="text-[13px] font-medium text-zinc-900">새 MSP 계약</span>
              </Link>
              <Link href="/msp/clients/new" className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-50">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                </span>
                <span className="text-[13px] font-medium text-zinc-900">새 고객 등록</span>
              </Link>
              <button type="button" aria-label="전역 검색 열기 (⌘K)" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-zinc-50">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50">
                  <SearchIcon className="h-3.5 w-3.5 text-blue-600" />
                </span>
                <span className="text-[13px] font-medium text-zinc-900">고객 검색</span>
              </button>
            </div>
          </div>

          {/* 최근 활동 */}
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="mb-3 text-base font-semibold text-zinc-900">최근 활동</h3>
            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {(!activity || activity.length === 0) ? (
                <p className="py-8 text-center text-sm text-zinc-400">활동 이력이 없습니다</p>
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

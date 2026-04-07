'use client';

import { useClients } from '@/hooks/use-clients';
import { useContracts } from '@/hooks/use-contracts';
import { BarChart3 } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  change: string;
  changeColor?: string;
}

function KpiCard({ label, value, change, changeColor = 'text-zinc-500' }: KpiCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-5">
      <span className="text-[13px] font-medium text-zinc-500">{label}</span>
      <span className="text-[32px] font-bold leading-none text-zinc-900">{value}</span>
      <span className={`text-xs ${changeColor}`}>{change}</span>
    </div>
  );
}

interface ActivityItemProps {
  title: string;
  action: string;
  actionColor?: string;
  meta: string;
  isLast?: boolean;
}

function ActivityItem({ title, action, actionColor = 'text-blue-600', meta, isLast }: ActivityItemProps) {
  return (
    <div className={`space-y-0.5 pb-2.5 ${isLast ? '' : 'border-b border-zinc-100'}`}>
      <p className="text-[13px] font-medium text-zinc-900">{title}</p>
      <p className={`text-xs ${actionColor}`}>{action}</p>
      <p className="text-[11px] text-zinc-400">{meta}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: clientsData } = useClients({ page: 1, pageSize: 1, sortBy: 'name', sortOrder: 'asc' });
  const { data: mspData } = useContracts({ page: 1, pageSize: 1, type: 'msp', sortBy: 'created_at', sortOrder: 'desc' });
  const { data: ttData } = useContracts({ page: 1, pageSize: 1, type: 'tt', sortBy: 'created_at', sortOrder: 'desc' });

  const totalClients = clientsData?.total ?? 0;
  const mspContracts = mspData?.total ?? 0;
  const ttContracts = ttData?.total ?? 0;
  const activeContracts = mspContracts + ttContracts;

  return (
    <div className="flex h-full flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-zinc-900">대시보드</h1>
          <p className="text-sm text-zinc-500">전사 현황을 한눈에 확인하세요</p>
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="총 고객 수"
          value={String(totalClients)}
          change="전월 대비 -"
          changeColor="text-zinc-400"
        />
        <KpiCard
          label="신규 고객"
          value="-"
          change="이번 달"
        />
        <KpiCard
          label="활성 계약"
          value={String(activeContracts)}
          change={`MSP ${mspContracts} · 교육 ${ttContracts}`}
        />
        <KpiCard
          label="총 매출"
          value="-"
          change="집계 준비 중"
          changeColor="text-zinc-400"
        />
      </div>

      {/* 하단: 차트 + 최근 활동 */}
      <div className="flex flex-1 gap-4">
        {/* 왼쪽: 차트 영역 */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-1 flex-col gap-4 rounded-xl border border-zinc-200 p-5">
            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-zinc-900">월별 매출 추이</span>
            </div>
            <div className="flex flex-1 items-center justify-center rounded-lg bg-zinc-50">
              <div className="flex flex-col items-center gap-2 text-zinc-400">
                <BarChart3 className="h-8 w-8" />
                <span className="text-sm">매출 데이터 연동 후 차트가 표시됩니다</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="h-[180px] rounded-xl border border-zinc-200 p-5">
              <span className="text-[13px] font-semibold text-zinc-900">계약 파이프라인</span>
              <div className="flex h-full items-center justify-center">
                <span className="text-sm text-zinc-400">준비 중</span>
              </div>
            </div>
            <div className="h-[180px] rounded-xl border border-zinc-200 p-5">
              <span className="text-[13px] font-semibold text-zinc-900">팀별 매출</span>
              <div className="flex h-full items-center justify-center">
                <span className="text-sm text-zinc-400">준비 중</span>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 최근 활동 */}
        <div className="w-80 rounded-xl border border-zinc-200 p-5">
          <h3 className="mb-3 text-base font-semibold text-zinc-900">최근 활동</h3>
          <div className="space-y-3">
            <div className="flex flex-col items-center justify-center py-8 text-zinc-400">
              <span className="text-sm">활동 로그 연동 후 표시됩니다</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

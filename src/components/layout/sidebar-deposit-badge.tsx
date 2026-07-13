'use client';

import { isEndedStage } from '@/lib/deposit/stage';
import { useDepositAccounts } from '@/hooks/use-deposit-accounts';

/**
 * 사이드바 "예치금" 메뉴 우측 배지 — critical 알림 계좌 수.
 * 카드/KPI와 동일한 `metrics.alertLevel`을 사용 (서비스에서 사전 계산) + 종료/해지 계정 제외(대시보드 홈과 동일 기준).
 *
 * Pre-mortem T-3: 모든 deposit mutation이 depositKeys.all을 invalidate → 자동 갱신.
 */
export function SidebarDepositBadge() {
  const { data: accounts = [] } = useDepositAccounts();

  const criticalCount = accounts.filter(
    (a) => !isEndedStage(a.contract.stage) && a.metrics.alertLevel === 'critical',
  ).length;

  if (criticalCount === 0) return null;

  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white"
      aria-label={`긴급 ${criticalCount}건`}
    >
      {criticalCount}
    </span>
  );
}

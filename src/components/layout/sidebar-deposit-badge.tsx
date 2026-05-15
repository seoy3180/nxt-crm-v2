'use client';

import { useDepositAccounts } from '@/hooks/use-deposit-accounts';
import { DEPOSIT_ALERT_THRESHOLDS } from '@/lib/deposit/constants';

/**
 * 사이드바 "예치금" 메뉴 우측 배지 — 사용자가 접근 가능한 범위의 critical 계좌 수.
 *
 * 1차 판정만 (트랜잭션 미조회): balancePct < critical.balancePct 또는 balance < 0.
 * 대시보드 카드에서 daysUntilDepleted까지 본 정밀한 critical과 차이날 수 있으나,
 * 배지는 "주목 필요" 신호 용도이므로 1차 판정으로 충분.
 *
 * Pre-mortem T-3: 모든 deposit mutation이 invalidate하므로 자동 갱신.
 */
export function SidebarDepositBadge() {
  const { data: accounts = [] } = useDepositAccounts();

  const criticalCount = accounts.filter((a) => {
    if (a.balance < 0) return true;
    if (a.total_deposit <= 0) return false;
    const pct = (a.balance / a.total_deposit) * 100;
    return pct < DEPOSIT_ALERT_THRESHOLDS.critical.balancePct;
  }).length;

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

import { useQuery } from '@tanstack/react-query';
import { depositService } from '@/lib/services/deposit-service';
import { depositKeys } from '@/lib/query-keys';

/**
 * 활성 예치금 계좌 + 계약 정보 + 정밀 메트릭 (alertLevel/avgMonthlyUsage/daysUntilDepleted/balancePct).
 * 카드/KPI/사이드바 배지/정렬 모두 동일한 `metrics.alertLevel`을 source of truth로 사용.
 */
export function useDepositAccounts() {
  return useQuery({
    queryKey: depositKeys.accounts(),
    queryFn: () => depositService.listAccountsWithMetrics(),
  });
}

/** 예치금 계좌 활성화 대상 MSP 계약 (미설정 + 비활성). */
export function useActivatableContracts() {
  return useQuery({
    queryKey: depositKeys.activatable(),
    queryFn: () => depositService.listActivatableMspContracts(),
  });
}

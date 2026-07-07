import { useQuery, type QueryClient } from '@tanstack/react-query';
import { depositService } from '@/lib/services/deposit-service';

/**
 * 예치금 도메인의 모든 Query Key.
 * mutation 후 `depositKeys.all`을 invalidate하면 관련 쿼리 일괄 갱신 (Pre-mortem T-3 대응).
 */
export const depositKeys = {
  all: ['deposit'] as const,
  accounts: () => [...depositKeys.all, 'accounts'] as const,
  account: (id: string) => [...depositKeys.all, 'account', id] as const,
  accountByContract: (contractId: string) =>
    [...depositKeys.all, 'by-contract', contractId] as const,
  txns: (accountId: string) => [...depositKeys.all, 'txns', accountId] as const,
  activatable: () => [...depositKeys.all, 'activatable'] as const,
};

/** 계약 stage 변경 시 계약 목록(스테이지 보드 + 테이블 뷰) + 예치금 쿼리를 함께 invalidate (변경 지점 간 드리프트 방지). */
export function invalidateContractStageQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['contracts'] });
  queryClient.invalidateQueries({ queryKey: ['nxt-contracts-table'] });
  queryClient.invalidateQueries({ queryKey: ['msp-contracts-table'] });
  queryClient.invalidateQueries({ queryKey: depositKeys.all });
}

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

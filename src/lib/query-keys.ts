import type { QueryClient } from '@tanstack/react-query';

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

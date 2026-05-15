import { useQuery } from '@tanstack/react-query';
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
};

/** 활성 예치금 계좌 + 계약 정보 전체 (대시보드용). */
export function useDepositAccounts() {
  return useQuery({
    queryKey: depositKeys.accounts(),
    queryFn: () => depositService.listAccounts(),
  });
}

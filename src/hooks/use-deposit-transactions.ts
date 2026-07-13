import { useQuery } from '@tanstack/react-query';
import { depositService } from '@/lib/services/deposit-service';
import { depositKeys } from '@/lib/query-keys';

/** 특정 계좌의 거래 내역 전체 (voided 포함, 날짜 내림차순). */
export function useDepositTransactions(accountId: string | null | undefined) {
  return useQuery({
    queryKey: depositKeys.txns(accountId ?? ''),
    queryFn: () => depositService.listTransactions(accountId!),
    enabled: !!accountId,
  });
}

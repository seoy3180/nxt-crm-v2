import { useQuery } from '@tanstack/react-query';
import { depositService } from '@/lib/services/deposit-service';
import { depositKeys } from './use-deposit-accounts';

/** 특정 계약의 활성 예치금 계좌 (계약 상세 탭용). 없으면 null. */
export function useDepositAccountByContract(contractId: string | null | undefined) {
  return useQuery({
    queryKey: depositKeys.accountByContract(contractId ?? ''),
    queryFn: () => depositService.getByContract(contractId!),
    enabled: !!contractId,
  });
}

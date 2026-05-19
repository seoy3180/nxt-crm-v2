import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { depositService, type AddTransactionInput } from '@/lib/services/deposit-service';
import { depositKeys } from './use-deposit-accounts';
import { TXN_TYPE_LABELS } from '@/lib/deposit/constants';

/**
 * mutation 후 전역 invalidate. Pre-mortem T-3 대응:
 * 대시보드/사이드바/계약 탭이 단일 진입점에서 일관 갱신되도록 강제.
 */
function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: depositKeys.all });
}

export function useActivateDeposit() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (contractId: string) => depositService.activate(contractId),
    onSuccess: () => {
      invalidate();
      toast.success('예치금 계좌가 활성화되었습니다');
    },
    onError: (e) => toast.error(`활성화 실패: ${(e as Error).message}`),
  });
}

export function useDeactivateDeposit() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (accountId: string) => depositService.deactivate(accountId),
    onSuccess: () => {
      invalidate();
      toast.success('예치금 계좌가 비활성화되었습니다');
    },
    onError: (e) => toast.error(`비활성화 실패: ${(e as Error).message}`),
  });
}

export function useAddDepositTransaction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (params: AddTransactionInput) => depositService.addTransaction(params),
    onSuccess: (_data, vars) => {
      invalidate();
      const label = TXN_TYPE_LABELS[vars.txn_type];
      toast.success(`${label} ${Math.abs(vars.amount).toLocaleString('ko-KR')}이 등록되었습니다`);
    },
    onError: (e) => toast.error(`등록 실패: ${(e as Error).message}`),
  });
}

export function useVoidDepositTransaction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      depositService.voidTransaction(id, reason),
    onSuccess: () => {
      invalidate();
      toast.success('트랜잭션이 무효화되었습니다');
    },
    onError: (e) => toast.error(`무효화 실패: ${(e as Error).message}`),
  });
}

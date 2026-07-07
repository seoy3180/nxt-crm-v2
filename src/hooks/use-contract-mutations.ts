'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';
import type {
  ContractCreateInput,
  ContractUpdateInput,
  MspDetailInput,
  StageChangeInput,
} from '@/lib/validators/contract';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';
import { invalidateContractStageQueries } from '@/hooks/use-deposit-accounts';

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContractCreateInput) => contractService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('계약이 등록되었습니다');
    },
    onError: (err) => {
      toast.error(`계약 등록 실패: ${getErrorMessage(err)}`);
    },
  });
}

export function useUpdateContract(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContractUpdateInput) => contractService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('계약 정보가 업데이트되었습니다');
    },
    onError: (err) => {
      toast.error(`계약 수정 실패: ${getErrorMessage(err)}`);
    },
  });
}

export function useUpdateMspDetails(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MspDetailInput) => contractService.updateMspDetails(contractId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      toast.success('MSP 정보가 업데이트되었습니다');
    },
    onError: (err) => {
      toast.error(`MSP 정보 수정 실패: ${getErrorMessage(err)}`);
    },
  });
}

export function useChangeStage(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, userId }: { input: StageChangeInput; userId: string }) =>
      contractService.changeStage(contractId, input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract-history', contractId] });
      invalidateContractStageQueries(queryClient);
      toast.success('단계가 변경되었습니다');
    },
    onError: (err) => {
      toast.error(`단계 변경 실패: ${getErrorMessage(err)}`);
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contractService.softDelete(id),
    onSuccess: (result) => {
      // BIZ-5: 예치금 잔액으로 차단된 경우 토스트만 띄우고 invalidate 생략
      if (result.blocked) {
        const sym = result.blocked.currency === 'USD' ? '$' : '₩';
        toast.error(
          `예치금 잔액이 ${sym} ${Math.abs(result.blocked.balance).toLocaleString('ko-KR')} 남아있어 삭제할 수 없습니다. 환불(refund) 후 다시 시도하세요.`,
        );
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['deposit'] });
      toast.success('계약이 삭제되었습니다');
    },
    onError: (err) => {
      toast.error(`계약 삭제 실패: ${getErrorMessage(err)}`);
    },
  });
}

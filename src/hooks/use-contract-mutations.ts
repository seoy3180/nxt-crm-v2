'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';
import type { ContractCreateInput, ContractUpdateInput, MspDetailInput, StageChangeInput } from '@/lib/validators/contract';
import { toast } from 'sonner';

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContractCreateInput) => contractService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('계약이 등록되었습니다');
    },
    onError: () => {
      toast.error('계약 등록에 실패했습니다');
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
    onError: () => {
      toast.error('계약 수정에 실패했습니다');
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
    onError: () => {
      toast.error('MSP 정보 수정에 실패했습니다');
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
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('단계가 변경되었습니다');
    },
    onError: () => {
      toast.error('단계 변경에 실패했습니다');
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contractService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('계약이 삭제되었습니다');
    },
    onError: () => {
      toast.error('계약 삭제에 실패했습니다');
    },
  });
}

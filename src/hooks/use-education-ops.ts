'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { educationOpService } from '@/lib/services/contract-service';
import type { EduOperationInput } from '@/lib/validators/contract';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

export function useEducationOps(contractId: string) {
  return useQuery({
    queryKey: ['education-ops', contractId],
    queryFn: () => educationOpService.listByContract(contractId),
    enabled: !!contractId,
  });
}

export function useCreateEducationOp(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EduOperationInput) => educationOpService.create(contractId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-ops', contractId] });
      toast.success('운영이 추가되었습니다');
    },
    onError: (err) => {
      toast.error(`운영 추가 실패: ${getErrorMessage(err)}`);
    },
  });
}

export function useUpdateEducationOp(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EduOperationInput> }) =>
      educationOpService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-ops', contractId] });
      toast.success('운영 정보가 수정되었습니다');
    },
    onError: (err) => {
      toast.error(`운영 수정 실패: ${getErrorMessage(err)}`);
    },
  });
}

export function useDeleteEducationOp(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => educationOpService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-ops', contractId] });
      toast.success('운영이 삭제되었습니다');
    },
    onError: (err) => {
      toast.error(`운영 삭제 실패: ${getErrorMessage(err)}`);
    },
  });
}

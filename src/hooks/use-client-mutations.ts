'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/lib/services/client-service';
import type { ClientCreateInput, ClientUpdateInput } from '@/lib/validators/client';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClientCreateInput) => clientService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('고객이 등록되었습니다');
    },
    onError: (err) => {
      toast.error(`고객 등록 실패: ${getErrorMessage(err)}`);
    },
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClientUpdateInput) => clientService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('고객 정보가 업데이트되었습니다');
    },
    onError: (err) => {
      toast.error(`고객 수정 실패: ${getErrorMessage(err)}`);
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('고객이 삭제되었습니다');
    },
    onError: (err) => {
      toast.error(`고객 삭제 실패: ${getErrorMessage(err)}`);
    },
  });
}

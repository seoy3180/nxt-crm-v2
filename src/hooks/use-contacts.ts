'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactService } from '@/lib/services/client-service';
import type { ContactCreateInput, ContactUpdateInput } from '@/lib/validators/client';
import { toast } from 'sonner';

export function useContacts(clientId: string) {
  return useQuery({
    queryKey: ['contacts', clientId],
    queryFn: () => contactService.listByClient(clientId),
    enabled: !!clientId,
  });
}

export function useCreateContact(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContactCreateInput) =>
      contactService.create(clientId, input as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', clientId] });
      toast.success('연락처가 추가되었습니다');
    },
    onError: () => {
      toast.error('연락처 추가에 실패했습니다');
    },
  });
}

export function useUpdateContact(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContactUpdateInput }) =>
      contactService.update(id, input as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', clientId] });
      toast.success('연락처가 수정되었습니다');
    },
    onError: () => {
      toast.error('연락처 수정에 실패했습니다');
    },
  });
}

export function useDeleteContact(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', clientId] });
      toast.success('연락처가 삭제되었습니다');
    },
    onError: () => {
      toast.error('연락처 삭제에 실패했습니다');
    },
  });
}

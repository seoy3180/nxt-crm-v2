'use client';

import { useQuery } from '@tanstack/react-query';
import { clientService } from '@/lib/services/client-service';

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getById(id),
    enabled: !!id,
  });
}

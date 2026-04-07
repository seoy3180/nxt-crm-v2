'use client';

import { useQuery } from '@tanstack/react-query';
import { clientService } from '@/lib/services/client-service';
import type { ClientListQuery } from '@/lib/validators/client';

export function useClients(query: ClientListQuery) {
  return useQuery({
    queryKey: ['clients', query],
    queryFn: () => clientService.list(query),
  });
}

export function useParentSearch(search: string) {
  return useQuery({
    queryKey: ['clients', 'parents', search],
    queryFn: () => clientService.searchParents(search),
    enabled: search.length >= 1,
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => clientService.getProfiles(),
    staleTime: 5 * 60 * 1000,
  });
}

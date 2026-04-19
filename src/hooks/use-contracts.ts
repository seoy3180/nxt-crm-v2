'use client';

import { useQuery } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';
import type { ContractListQuery } from '@/lib/validators/contract';

export function useContracts(query: ContractListQuery & { enabled?: boolean }) {
  const { enabled, ...queryParams } = query;
  return useQuery({
    queryKey: ['contracts', queryParams],
    queryFn: () => contractService.list(queryParams),
    enabled: enabled ?? true,
  });
}

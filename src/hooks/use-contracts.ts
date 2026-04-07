'use client';

import { useQuery } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';
import type { ContractListQuery } from '@/lib/validators/contract';

export function useContracts(query: ContractListQuery) {
  return useQuery({
    queryKey: ['contracts', query],
    queryFn: () => contractService.list(query),
  });
}

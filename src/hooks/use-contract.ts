'use client';

import { useQuery } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractService.getById(id),
    enabled: !!id,
  });
}

export function useContractHistory(contractId: string) {
  return useQuery({
    queryKey: ['contract-history', contractId],
    queryFn: () => contractService.getHistory(contractId),
    enabled: !!contractId,
  });
}

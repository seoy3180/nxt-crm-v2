'use client';

import { useParams } from 'next/navigation';
import { useContract } from '@/hooks/use-contract';
import { ContractDetail } from '@/components/contracts/contract-detail';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function MspContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: contract, isLoading, isError, refetch } = useContract(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !contract) {
    return <ErrorState message="계약 정보를 불러올 수 없습니다" onRetry={() => refetch()} />;
  }

  return <ContractDetail contract={contract} />;
}

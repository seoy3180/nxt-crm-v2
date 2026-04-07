'use client';

import { useParams } from 'next/navigation';
import { useClient } from '@/hooks/use-client';
import { ClientTabs } from '@/components/clients/client-tabs';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: client, isLoading, isError, refetch } = useClient(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !client) {
    return <ErrorState message="고객 정보를 불러올 수 없습니다" onRetry={() => refetch()} />;
  }

  return <ClientTabs client={client} />;
}

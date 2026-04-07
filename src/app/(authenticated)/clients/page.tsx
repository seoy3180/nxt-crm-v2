'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ClientListFilters } from '@/components/clients/client-list-filters';
import { ClientTreeTable } from '@/components/clients/client-tree-table';
import { ErrorState } from '@/components/common/error-state';
import { useClients } from '@/hooks/use-clients';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 디바운스 훅
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

  const setValueDebounced = useCallback(
    (newValue: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setDebouncedValue(newValue), delay);
    },
    [delay],
  );

  return [debouncedValue, setValueDebounced] as const;
}

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useDebounce('', SEARCH_DEBOUNCE_MS);
  const [clientType, setClientType] = useState<string | undefined>();
  const [businessType, setBusinessType] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useClients({
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
    clientType: clientType as 'univ' | 'corp' | 'govt' | 'asso' | 'etc' | undefined,
    businessType: businessType as 'msp' | 'tt' | 'dev' | undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    setDebouncedSearch(value);
    setPage(1);
  }

  if (isError) {
    return <ErrorState message="고객 목록을 불러올 수 없습니다" onRetry={() => refetch()} />;
  }

  return (
    <div>
      <PageHeader title="고객 관리" />

      <div className="space-y-4">
        <ClientListFilters
          search={search}
          onSearchChange={handleSearchChange}
          clientType={clientType}
          onClientTypeChange={(v) => { setClientType(v); setPage(1); }}
          businessType={businessType}
          onBusinessTypeChange={(v) => { setBusinessType(v); setPage(1); }}
        />

        <ClientTreeTable
          clients={data?.data ?? []}
          loading={isLoading}
        />

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

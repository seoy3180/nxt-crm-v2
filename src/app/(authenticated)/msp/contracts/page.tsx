'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ContractFilters } from '@/components/contracts/contract-filters';
import { ContractTable } from '@/components/contracts/contract-table';
import { ContractKanban } from '@/components/contracts/contract-kanban';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useContracts } from '@/hooks/use-contracts';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';

export default function MspContractsPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stage, setStage] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const { data, isLoading } = useContracts({
    page,
    pageSize: viewMode === 'kanban' ? 100 : 20,
    search: debouncedSearch || undefined,
    type: 'msp',
    stage: stage || undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  return (
    <div className="flex h-full flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold text-zinc-900">MSP 계약</h1>

          {/* 뷰 모드 토글 */}
          <div className="flex overflow-hidden rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={cn(
                'h-8 px-3.5 text-[13px] font-medium transition-colors',
                viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50',
              )}
            >
              칸반
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'h-8 px-3.5 text-[13px] font-medium transition-colors',
                viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50',
              )}
            >
              테이블
            </button>
          </div>
        </div>

        <Link href="/msp/contracts/new">
          <Button className="h-9 gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            새 계약
          </Button>
        </Link>
      </div>

      {/* 필터 (테이블 뷰에서만) */}
      {viewMode === 'table' && (
        <ContractFilters
          contractType="msp"
          search={search}
          onSearchChange={handleSearchChange}
          stage={stage}
          onStageChange={(v) => { setStage(v); setPage(1); }}
        />
      )}

      {/* 뷰 */}
      {viewMode === 'kanban' ? (
        <ContractKanban
          contracts={data?.data ?? []}
          loading={isLoading}
          contractType="msp"
        />
      ) : (
        <>
          <ContractTable
            contracts={data?.data ?? []}
            loading={isLoading}
            contractType="msp"
          />
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-zinc-500">{page} / {data.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { Suspense, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { useSectionBasePath } from '@/hooks/use-section-base-path';
import { ContractStageFilter, ContractSearch } from '@/components/contracts/contract-filters';
import { ContractKanban } from '@/components/contracts/contract-kanban';
import { ColumnSettings } from '@/components/common/column-settings';
import { InlineEditTable } from '@/components/common/inline-edit-table';
import { InlineEditToggle, InlineEditActions } from '@/components/common/inline-edit-toolbar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useContracts } from '@/hooks/use-contracts';
import { useInlineEdit } from '@/hooks/use-inline-edit';
import { useColumnPreference } from '@/hooks/use-user-preferences';
import { useCurrentUser } from '@/hooks/use-current-user';
import { createClient } from '@/lib/supabase/client';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import {
  type ContractTableRow,
  type ContractColumnDef,
  MSP_COLUMNS,
  ACTIONS_COLUMN,
} from '@/lib/contracts/table-types';
import {
  renderCellValue as sharedRenderCell,
  renderEditingCell as sharedRenderEditingCell,
} from '@/lib/contracts/table-render';
import { saveInlineChanges } from '@/lib/contracts/table-save';

// ─── 메인 컴포넌트 ─────────────────────────────────────
function MspContractsInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const searchParams = useSearchParams();
  const initialView = (searchParams.get('view') ?? 'kanban') as 'kanban' | 'table';
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(initialView);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stage, setStage] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const basePath = useSectionBasePath();

  // 인라인 편집
  const inlineEdit = useInlineEdit<ContractTableRow>({
    getId: (c) => c.id,
    getOriginalValue: (c, key) => String(c[key as keyof ContractTableRow] ?? ''),
    getChangeDefaults: (c) => ({ contractId: c.id, mspDetailId: c.mspDetailId }),
    onSave: async (changes) => {
      await saveInlineChanges({
        changes,
        columns: MSP_COLUMNS,
        contractType: 'msp',
        currentUserId: currentUser?.id ?? null,
        contracts: tableContracts?.data ?? [],
        dynamicOptions,
      });
      queryClient.invalidateQueries({ queryKey: ['msp-contracts-table'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const { editMode, tempValue, setTempValue, saveCellEdit, setEditingCell } = inlineEdit;

  const configurableKeys = useMemo(() => new Set(MSP_COLUMNS.map((c) => c.key)), []);
  const defaultCols = useMemo(() => MSP_COLUMNS.map((c) => c.key), []);
  const { columns: rawVisibleColumns, saveColumns } = useColumnPreference('mspContractsColumns', defaultCols);
  const visibleColumns = useMemo(() => rawVisibleColumns.filter((k) => configurableKeys.has(k)), [rawVisibleColumns, configurableKeys]);
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  function handleViewChange(view: 'kanban' | 'table') {
    setViewMode(view);
    router.replace(`/msp/contracts?view=${view}`, { scroll: false });
  }

  // 칸반용 기본 쿼리
  const { data: kanbanData, isLoading: kanbanLoading } = useContracts({
    page,
    pageSize: viewMode === 'kanban' ? 100 : 20,
    search: debouncedSearch || undefined,
    type: 'msp',
    stage: stage || undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // 직원 목록
  const { data: employeeOptions } = useQuery({
    queryKey: ['employees-options'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from('employees').select('id, name').eq('is_active', true).order('name');
      return (data ?? []).map((e) => ({ value: e.id, label: e.name }));
    },
    staleTime: 5 * 60 * 1000,
    enabled: viewMode === 'table',
  });

  const dynamicOptions: Record<string, { value: string; label: string }[]> = {
    employees: employeeOptions ?? [],
  };

  // 테이블용 전용 쿼리 (msp_details JOIN)
  const { data: tableContracts, isLoading: tableLoading } = useQuery({
    queryKey: ['msp-contracts-table', debouncedSearch, stage, page],
    queryFn: async () => {
      const supabase = createClient();
      const pageSize = 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('contracts')
        .select('*, clients!contracts_client_id_fkey(name), profiles!contracts_assigned_to_fkey(name), contacts!contracts_contact_id_fkey(name), contract_msp_details(*, employees!contract_msp_details_sales_rep_id_fkey(name))', { count: 'exact' })
        .eq('type', 'msp')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (stage) q = q.eq('stage', stage);
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`);
      q = q.range(from, to);

      const { data, count, error } = await q;
      if (error) throw error;

      const mapped = (data ?? []).map((row: Record<string, unknown>): ContractTableRow => {
        const mspRaw = Array.isArray(row.contract_msp_details)
          ? (row.contract_msp_details as Record<string, unknown>[])[0]
          : (row.contract_msp_details as Record<string, unknown> | null);
        const emp = mspRaw?.employees as { name: string } | null;

        return {
          id: row.id as string,
          name: row.name as string,
          type: 'msp',
          clientId: (row.client_id as string) ?? null,
          clientName: (row.clients as { name: string } | null)?.name ?? null,
          stage: row.stage as string | null,
          totalAmount: (row.total_amount as number) ?? 0,
          assignedTo: (row.assigned_to as string) ?? null,
          assignedToName: (row.profiles as { name: string } | null)?.name ?? null,
          contactName: (row.contacts as { name: string } | null)?.name ?? null,
          mspDetailId: (mspRaw?.id as string) ?? null,
          expectedMrr: (mspRaw?.expected_mrr as number) ?? null,
          creditShare: (mspRaw?.credit_share as string) ?? null,
          payer: (mspRaw?.payer as string) ?? null,
          billingMethod: (mspRaw?.billing_method as string) ?? null,
          salesRepId: (mspRaw?.sales_rep_id as string) ?? null,
          salesRepName: emp?.name ?? null,
          awsAmount: (mspRaw?.aws_amount as number) ?? null,
          tags: (mspRaw?.tags as string[] | null) ?? [],
        };
      });

      return { data: mapped, total: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) };
    },
    enabled: viewMode === 'table',
  });

  const columns = useMemo(() => {
    const colMap = new Map(MSP_COLUMNS.map((c) => [c.key, c]));
    const cols = visibleColumns.map((key) => colMap.get(key)).filter(Boolean) as ContractColumnDef[];
    cols.push(ACTIONS_COLUMN);
    return cols;
  }, [visibleColumns]);

  const renderOpts = { basePath: `${basePath}/contracts` === '/contracts' ? basePath : basePath, contractType: 'msp', dynamicOptions };

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">MSP 계약</h1>

      <div className="flex items-center gap-2">
        <div className="flex overflow-hidden rounded-lg border border-zinc-200">
          <button type="button" onClick={() => handleViewChange('kanban')} className={cn('h-8 px-3.5 text-[13px] font-medium transition-colors', viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50')}>칸반</button>
          <button type="button" onClick={() => handleViewChange('table')} className={cn('h-8 px-3.5 text-[13px] font-medium transition-colors', viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50')}>테이블</button>
        </div>

        {viewMode === 'table' && (
          <>
            <ColumnSettings
              allColumns={MSP_COLUMNS.map((c) => ({ key: c.key, label: c.label }))}
              visibleColumns={visibleColumns}
              onColumnsChange={saveColumns}
              open={showColumnSettings}
              onOpenChange={setShowColumnSettings}
              fixedColumns={['name']}
            />
            <InlineEditToggle inlineEdit={inlineEdit} />
          </>
        )}

        <ContractStageFilter contractType="msp" stage={stage} onStageChange={(v) => { setStage(v); setPage(1); }} />
        <div className="flex-1" />
        <ContractSearch search={search} onSearchChange={handleSearchChange} />
        {viewMode === 'table' && <InlineEditActions inlineEdit={inlineEdit} />}

        {editMode ? (
          <button disabled className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white opacity-40 cursor-not-allowed">
            <Plus className="h-4 w-4" /> 새 계약
          </button>
        ) : (
          <Link href="/msp/contracts/new">
            <Button className="h-9 gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium hover:bg-blue-700">
              <Plus className="h-4 w-4" /> 새 계약
            </Button>
          </Link>
        )}
      </div>

      {viewMode === 'kanban' ? (
        <ContractKanban contracts={kanbanData?.data ?? []} loading={kanbanLoading} contractType="msp" />
      ) : (
        <>
          <InlineEditTable<ContractTableRow, ContractColumnDef>
            data={tableContracts?.data ?? []}
            columns={columns}
            inlineEdit={inlineEdit}
            getId={(c) => c.id}
            isLoading={tableLoading}
            skeletonRows={5}
            emptyText="등록된 MSP 계약이 없습니다"
            renderCell={(row, col, val) => sharedRenderCell(row, col, val, { basePath, contractType: 'msp', dynamicOptions })}
            renderEditingCell={(row, col) => sharedRenderEditingCell(row, col, { tempValue, setTempValue, saveCellEdit, setEditingCell, dynamicOptions })}
          />
          {tableContracts && tableContracts.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-zinc-500">{page} / {tableContracts.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= tableContracts.totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MspContractsPage() {
  return (
    <Suspense fallback={null}>
      <MspContractsInner />
    </Suspense>
  );
}

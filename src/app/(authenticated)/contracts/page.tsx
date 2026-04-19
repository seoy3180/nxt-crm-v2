'use client';

import { Suspense, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn, formatAmount, safeNumber, getStageColor } from '@/lib/utils';
import { ContractStageFilter, ContractSearch } from '@/components/contracts/contract-filters';
import { ContractKanban } from '@/components/contracts/contract-kanban';
import { ColumnSettings } from '@/components/common/column-settings';
import {
  InlineEditTable,
  type InlineEditColumnBase,
} from '@/components/common/inline-edit-table';
import {
  InlineEditToggle,
  InlineEditActions,
} from '@/components/common/inline-edit-toolbar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useContracts } from '@/hooks/use-contracts';
import { useInlineEdit } from '@/hooks/use-inline-edit';
import { useColumnPreference } from '@/hooks/use-user-preferences';
import { useCurrentUser } from '@/hooks/use-current-user';
import { contractService } from '@/lib/services/contract-service';
import { createClient } from '@/lib/supabase/client';
import {
  MSP_STAGES,
  EDU_STAGES,
  CREDIT_SHARE_OPTIONS,
  PAYER_OPTIONS,
  BILLING_METHOD_OPTIONS,
  SEARCH_DEBOUNCE_MS,
} from '@/lib/constants';

// ─── 타입 ─────────────────────────────────────────────
interface TableContract {
  id: string;
  name: string;
  type: string;
  clientId: string | null;
  clientName: string | null;
  stage: string | null;
  totalAmount: number;
  assignedTo: string | null;
  assignedToName: string | null;
  contactName: string | null;
  // msp_details (MSP 탭에서만 사용)
  mspDetailId: string | null;
  expectedMrr: number | null;
  creditShare: string | null;
  payer: string | null;
  billingMethod: string | null;
  salesRepId: string | null;
  salesRepName: string | null;
  awsAmount: number | null;
  tags: string[];
}

interface ColumnDef extends InlineEditColumnBase {
  type: 'text' | 'number' | 'select' | 'dynamic-select' | 'tags';
  options?: readonly string[] | readonly { readonly value: string; readonly label: string }[];
  optionsKey?: string;
  table: 'contracts' | 'msp_details';
  dbColumn?: string;
}

// ─── 컬럼 정의 ────────────────────────────────────────

const MSP_COLUMNS: ColumnDef[] = [
  { key: 'name', label: '계약명', editable: false, type: 'text', table: 'contracts' },
  { key: 'clientName', label: '고객', width: 'w-[140px]', editable: false, type: 'text', table: 'contracts' },
  { key: 'stage', label: '단계', width: 'w-[110px]', editable: true, type: 'select', options: MSP_STAGES, table: 'contracts', dbColumn: 'stage' },
  { key: 'totalAmount', label: '금액', width: 'w-[120px]', editable: true, type: 'number', table: 'contracts', dbColumn: 'total_amount' },
  { key: 'expectedMrr', label: '예상 MRR', width: 'w-[120px]', editable: true, type: 'number', table: 'msp_details', dbColumn: 'expected_mrr' },
  { key: 'creditShare', label: '크레딧 쉐어', width: 'w-[110px]', editable: true, type: 'select', options: CREDIT_SHARE_OPTIONS, table: 'msp_details', dbColumn: 'credit_share' },
  { key: 'payer', label: 'Payer', width: 'w-[120px]', editable: true, type: 'select', options: PAYER_OPTIONS, table: 'msp_details', dbColumn: 'payer' },
  { key: 'billingMethod', label: '청구 방식', width: 'w-[140px]', editable: true, type: 'select', options: BILLING_METHOD_OPTIONS, table: 'msp_details', dbColumn: 'billing_method' },
  { key: 'salesRepId', label: '영업 담당', width: 'w-[120px]', editable: true, type: 'dynamic-select', optionsKey: 'employees', table: 'msp_details', dbColumn: 'sales_rep_id' },
  { key: 'assignedTo', label: '사내 담당자', width: 'w-[120px]', editable: true, type: 'dynamic-select', optionsKey: 'employees', table: 'contracts', dbColumn: 'assigned_to' },
  { key: 'tags', label: '태그', width: 'w-[180px]', editable: true, type: 'tags', table: 'msp_details', dbColumn: 'tags' },
];

const BASIC_COLUMNS: ColumnDef[] = [
  { key: 'name', label: '계약명', editable: false, type: 'text', table: 'contracts' },
  { key: 'clientName', label: '고객', width: 'w-[140px]', editable: false, type: 'text', table: 'contracts' },
  { key: 'stage', label: '단계', width: 'w-[110px]', editable: true, type: 'select', options: EDU_STAGES, table: 'contracts', dbColumn: 'stage' },
  { key: 'totalAmount', label: '금액', width: 'w-[120px]', editable: true, type: 'number', table: 'contracts', dbColumn: 'total_amount' },
  { key: 'assignedTo', label: '사내 담당자', width: 'w-[120px]', editable: true, type: 'dynamic-select', optionsKey: 'employees', table: 'contracts', dbColumn: 'assigned_to' },
  { key: 'contactName', label: '고객사 담당자', width: 'w-[120px]', editable: false, type: 'text', table: 'contracts' },
];

const ACTIONS_COLUMN: ColumnDef = { key: 'actions', label: '', width: 'w-[90px]', editable: false, type: 'text', table: 'contracts' };

function getColumnsForType(type: string) {
  return type === 'msp' ? MSP_COLUMNS : BASIC_COLUMNS;
}

const PREF_KEYS: Record<string, string> = {
  msp: 'nxtContractsMspColumns',
  tt: 'nxtContractsEduColumns',
  dev: 'nxtContractsDevColumns',
};

// ─── 뱃지 ─────────────────────────────────────────────

function getStageBadge(stage: string | null, type: string) {
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  const label = stage ? (stages.find((s) => s.value === stage)?.label ?? stage) : '미지정';
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${getStageColor(stage)}`}>{label}</span>;
}

const BIZ_TABS = [
  { value: 'msp', label: 'MSP' },
  { value: 'tt', label: '교육' },
  { value: 'dev', label: '개발' },
] as const;

// ─── 메인 ─────────────────────────────────────────────

function ContractsPageInner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const searchParams = useSearchParams();
  const initialType = searchParams.get('type') ?? 'msp';
  const initialView = (searchParams.get('view') ?? 'kanban') as 'kanban' | 'table';
  const [contractType, setContractType] = useState<string>(initialType);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>(initialView);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stage, setStage] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const allColumns = getColumnsForType(contractType);

  // 인라인 편집
  const inlineEdit = useInlineEdit<TableContract>({
    getId: (c) => c.id,
    getOriginalValue: (c, key) => String(c[key as keyof TableContract] ?? ''),
    getChangeDefaults: (c) => ({ contractId: c.id, mspDetailId: c.mspDetailId }),
    onSave: async (changes) => {
      const supabase = createClient();
      const promises = Array.from(changes.values()).map((change) => {
        const contractUpdate: Record<string, unknown> = {};
        const mspUpdate: Record<string, unknown> = {};
        allColumns.forEach((col) => {
          if (!col.editable || !col.dbColumn || !(col.key in change)) return;
          const val = change[col.key];
          const dbVal = col.type === 'number' ? safeNumber(val)
            : col.type === 'tags' ? String(val ?? '').split(',').map((s) => s.trim()).filter(Boolean)
            : val;
          if (col.table === 'contracts') contractUpdate[col.dbColumn] = dbVal;
          else mspUpdate[col.dbColumn] = dbVal;
        });
        const ops: PromiseLike<void>[] = [];
        if (Object.keys(contractUpdate).length > 0) {
          ops.push(supabase.from('contracts').update(contractUpdate).eq('id', change.contractId as string)
            .then(({ error }) => { if (error) throw error; }));
        }
        if (Object.keys(mspUpdate).length > 0 && contractType === 'msp') {
          if (change.mspDetailId) {
            ops.push(supabase.from('contract_msp_details').update(mspUpdate).eq('contract_id', change.contractId as string)
              .then(({ error }) => { if (error) throw error; }));
          } else {
            ops.push(supabase.from('contract_msp_details').insert({ contract_id: change.contractId as string, ...mspUpdate })
              .then(({ error }) => { if (error) throw error; }));
          }
        }
        return Promise.all(ops);
      });
      await Promise.all(promises);

      // 변경이력
      if (currentUser) {
        const contracts = tableData?.data ?? [];
        const historyPromises = Array.from(changes.entries()).map(([contractId, change]) => {
          const original = contracts.find((c: TableContract) => c.id === contractId);
          if (!original) return Promise.resolve();
          const fieldChanges: { field: string; oldValue: string | null; newValue: string | null }[] = [];
          allColumns.forEach((col) => {
            if (!col.editable || !col.dbColumn || !(col.key in change)) return;
            let oldVal = String(original[col.key as keyof TableContract] ?? '') || null;
            let newVal = String(change[col.key] ?? '') || null;
            if (col.type === 'dynamic-select' && col.optionsKey) {
              const opts = dynamicOptions[col.optionsKey] ?? [];
              if (oldVal) oldVal = opts.find((o) => o.value === oldVal)?.label ?? oldVal;
              if (newVal) newVal = opts.find((o) => o.value === newVal)?.label ?? newVal;
            }
            if (col.key === 'stage') {
              const stages = contractType === 'msp' ? MSP_STAGES : EDU_STAGES;
              const stageOpts = stages as readonly { readonly value: string; readonly label: string }[];
              if (oldVal) oldVal = stageOpts.find((s) => s.value === oldVal)?.label ?? oldVal;
              if (newVal) newVal = stageOpts.find((s) => s.value === newVal)?.label ?? newVal;
            }
            if (col.type === 'number') {
              if (oldVal) oldVal = formatAmount(Number(oldVal));
              if (newVal) newVal = formatAmount(Number(newVal));
            }
            if (oldVal !== newVal) fieldChanges.push({ field: col.label, oldValue: oldVal, newValue: newVal });
          });
          return contractService.logChanges(contractId, currentUser.id, fieldChanges);
        });
        await Promise.all(historyPromises).catch(() => {});
      }

      queryClient.invalidateQueries({ queryKey: ['nxt-contracts-table'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const { editMode, tempValue, setTempValue, saveCellEdit, setEditingCell } = inlineEdit;

  const configurableKeys = useMemo(() => new Set(allColumns.map((c) => c.key)), [allColumns]);
  const defaultCols = useMemo(() => allColumns.map((c) => c.key), [allColumns]);
  const prefKey = PREF_KEYS[contractType] ?? 'nxtContractsMspColumns';
  const { columns: rawVisibleColumns, saveColumns } = useColumnPreference(prefKey, defaultCols);
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

  function updateUrl(type: string, view: string) {
    router.replace(`/contracts?type=${type}&view=${view}`, { scroll: false });
  }

  function handleBizTabChange(tab: string) {
    setContractType(tab);
    setStage(undefined);
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
    inlineEdit.handleCancelEdit();
    updateUrl(tab, viewMode);
  }

  function handleViewChange(view: 'kanban' | 'table') {
    setViewMode(view);
    updateUrl(contractType, view);
  }

  // 칸반용 쿼리
  const { data: kanbanData, isLoading: kanbanLoading } = useContracts({
    page,
    pageSize: viewMode === 'kanban' ? 100 : 20,
    search: debouncedSearch || undefined,
    type: contractType as 'msp' | 'tt' | 'dev',
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

  // 테이블용 쿼리
  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ['nxt-contracts-table', contractType, debouncedSearch, stage, page],
    queryFn: async () => {
      const supabase = createClient();
      const pageSize = 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const mspSelect = '*, clients!contracts_client_id_fkey(name), profiles!contracts_assigned_to_fkey(name), contacts!contracts_contact_id_fkey(name), contract_msp_details(*, employees!contract_msp_details_sales_rep_id_fkey(name))';
      const basicSelect = '*, clients!contracts_client_id_fkey(name), profiles!contracts_assigned_to_fkey(name), contacts!contracts_contact_id_fkey(name)';
      const selectClause = contractType === 'msp' ? mspSelect : basicSelect;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from('contracts')
        .select(selectClause, { count: 'exact' })
        .eq('type', contractType)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (stage) q = q.eq('stage', stage);
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`);
      q = q.range(from, to);

      const { data, count, error } = await q;
      if (error) throw error;

      const mapped = (data ?? []).map((row: Record<string, unknown>): TableContract => {
        const mspRaw = contractType === 'msp'
          ? (Array.isArray(row.contract_msp_details)
            ? (row.contract_msp_details as Record<string, unknown>[])[0]
            : (row.contract_msp_details as Record<string, unknown> | null))
          : null;
        const emp = mspRaw?.employees as { name: string } | null;

        return {
          id: row.id as string,
          name: row.name as string,
          type: row.type as string,
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
    const colMap = new Map(allColumns.map((c) => [c.key, c]));
    const cols = visibleColumns.map((key) => colMap.get(key)).filter(Boolean) as ColumnDef[];
    cols.push(ACTIONS_COLUMN);
    return cols;
  }, [visibleColumns, allColumns]);

  function resolveDisplayName(value: string, col: ColumnDef): string {
    if (col.type !== 'dynamic-select' || !value) return value;
    const opts = dynamicOptions[col.optionsKey ?? ''] ?? [];
    return opts.find((o) => o.value === value)?.label ?? value;
  }

  function renderCellValue(row: TableContract, col: ColumnDef, displayValue: string) {
    if (col.key === 'name') return row.name;
    if (col.key === 'clientName' && row.clientId) {
      return (
        <Link href={`/clients/${row.clientId}`} onClick={(e) => e.stopPropagation()} className="font-medium text-blue-600 hover:underline">
          {row.clientName ?? '-'}
        </Link>
      );
    }
    if (col.key === 'actions') {
      return (
        <Link href={`/contracts/${row.id}`} className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors">
          상세보기
        </Link>
      );
    }
    if (col.key === 'stage') return getStageBadge(displayValue || null, contractType);
    if (col.key === 'creditShare' && displayValue) {
      return <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">{displayValue}</span>;
    }
    if (col.type === 'number' && displayValue) return formatAmount(Number(displayValue));
    if (col.type === 'dynamic-select') return resolveDisplayName(displayValue, col) || '-';
    if (col.type === 'tags') {
      const tags = displayValue.split(',').map((s) => s.trim()).filter(Boolean);
      if (tags.length === 0) return '-';
      const shown = tags.slice(0, 2);
      const remaining = tags.length - shown.length;
      return (
        <div className="flex flex-wrap items-center justify-center gap-1">
          {shown.map((t) => (
            <span key={t} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600">{t}</span>
          ))}
          {remaining > 0 && <span className="text-[11px] text-zinc-400">+{remaining}</span>}
        </div>
      );
    }
    if (col.key === 'contactName') return displayValue || '-';
    return displayValue || '-';
  }

  function getSelectOptions(col: ColumnDef): { value: string; label: string }[] {
    if (!col.options) return [];
    const opts = col.options as readonly unknown[];
    if (opts.length === 0) return [];
    if (typeof opts[0] === 'string') return (opts as readonly string[]).map((o) => ({ value: o, label: o }));
    return [...(opts as readonly { readonly value: string; readonly label: string }[])];
  }

  function renderEditingCell(row: TableContract, col: ColumnDef) {
    if (col.type === 'select' || col.type === 'dynamic-select') {
      const opts = col.type === 'dynamic-select' ? (dynamicOptions[col.optionsKey ?? ''] ?? []) : getSelectOptions(col);
      return (
        <select
          autoFocus
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => saveCellEdit(row)}
          className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-1 text-[13px] text-zinc-900 outline-none"
        >
          <option value="">미지정</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (col.type === 'tags') {
      return <InlineTagSelect value={tempValue} onChange={setTempValue} onDone={() => saveCellEdit(row)} />;
    }
    return (
      <input
        autoFocus
        type="text"
        inputMode={col.type === 'number' ? 'numeric' : undefined}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => saveCellEdit(row)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter') saveCellEdit(row);
          if (e.key === 'Escape') setEditingCell(null);
        }}
        className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-2 text-[13px] text-zinc-900 outline-none"
      />
    );
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">계약 관리</h1>

      <div className="flex items-center gap-3">
        {/* 비즈니스 탭 */}
        <div className="flex border-b border-zinc-200">
          {BIZ_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleBizTabChange(tab.value)}
              className={cn(
                'h-8 px-3.5 text-[13px] font-medium transition-colors',
                contractType === tab.value
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-zinc-500 hover:text-zinc-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 뷰 모드 */}
        <div className="flex overflow-hidden rounded-lg border border-zinc-200">
          <button type="button" onClick={() => handleViewChange('kanban')} className={cn('h-8 px-3.5 text-[13px] font-medium transition-colors', viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50')}>
            칸반
          </button>
          <button type="button" onClick={() => handleViewChange('table')} className={cn('h-8 px-3.5 text-[13px] font-medium transition-colors', viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50')}>
            테이블
          </button>
        </div>

        {/* 테이블 전용: 컬럼 설정 + 편집 */}
        {viewMode === 'table' && (
          <>
            <ColumnSettings
              allColumns={allColumns.map((c) => ({ key: c.key, label: c.label }))}
              visibleColumns={visibleColumns}
              onColumnsChange={saveColumns}
              open={showColumnSettings}
              onOpenChange={setShowColumnSettings}
              fixedColumns={['name']}
            />
            <InlineEditToggle inlineEdit={inlineEdit} />
          </>
        )}

        <ContractStageFilter
          contractType={contractType}
          stage={stage}
          onStageChange={(v) => { setStage(v); setPage(1); }}
        />

        <div className="flex-1" />

        <ContractSearch search={search} onSearchChange={handleSearchChange} />

        {viewMode === 'table' && <InlineEditActions inlineEdit={inlineEdit} />}

        {editMode ? (
          <button disabled className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white opacity-40 cursor-not-allowed">
            <Plus className="h-4 w-4" /> 새 계약
          </button>
        ) : (
          <Link href="/contracts/new">
            <Button className="h-9 gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium hover:bg-blue-700">
              <Plus className="h-4 w-4" /> 새 계약
            </Button>
          </Link>
        )}
      </div>

      {/* 뷰 */}
      {viewMode === 'kanban' ? (
        <ContractKanban
          contracts={kanbanData?.data ?? []}
          loading={kanbanLoading}
          contractType={contractType}
        />
      ) : (
        <>
          <InlineEditTable<TableContract, ColumnDef>
            data={tableData?.data ?? []}
            columns={columns}
            inlineEdit={inlineEdit}
            getId={(c) => c.id}
            isLoading={tableLoading}
            skeletonRows={5}
            emptyText="등록된 계약이 없습니다"
            renderCell={renderCellValue}
            renderEditingCell={renderEditingCell}
          />

          {tableData && tableData.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-zinc-500">{page} / {tableData.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= tableData.totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const MSP_TAG_OPTIONS = ['디자인중시', '빠른결정', '가격민감', '기술중심'] as const;

function InlineTagSelect({ value, onChange }: { value: string; onChange: (v: string) => void; onDone: () => void }) {
  const selected = value.split(',').map((s) => s.trim()).filter(Boolean);

  function toggle(tag: string) {
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    onChange(next.join(', '));
  }

  return (
    <div className="relative">
      <div className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-left h-8">
        <span className="flex gap-1 overflow-hidden">
          {selected.length === 0
            ? <span className="text-[12px] text-zinc-400">태그 선택</span>
            : selected.map((t) => <span key={t} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">{t}</span>)
          }
        </span>
      </div>
      <div className="absolute z-20 mt-1 w-full rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
        <button type="button" onClick={() => onChange('')}
          className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] transition-colors ${selected.length === 0 ? 'bg-zinc-50' : 'hover:bg-zinc-50'}`}
        >
          <span className="font-medium text-zinc-400">선택 없음</span>
        </button>
        <div className="h-px bg-zinc-100" />
        {MSP_TAG_OPTIONS.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button key={tag} type="button" onClick={() => toggle(tag)}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] transition-colors ${active ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}
            >
              <div className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${active ? 'border-blue-600 bg-blue-600' : 'border-zinc-300'}`}>
                {active && <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 6l2.5 2.5 4.5-4.5" /></svg>}
              </div>
              <span className={`font-medium ${active ? 'text-blue-600' : 'text-zinc-600'}`}>{tag}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ContractsPage() {
  return (
    <Suspense fallback={null}>
      <ContractsPageInner />
    </Suspense>
  );
}

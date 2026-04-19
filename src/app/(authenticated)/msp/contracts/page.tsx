'use client';

import { Suspense, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn, formatAmount, safeNumber, getStageColor } from '@/lib/utils';
import { useSectionBasePath } from '@/hooks/use-section-base-path';
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
  CREDIT_SHARE_OPTIONS,
  PAYER_OPTIONS,
  BILLING_METHOD_OPTIONS,
  SEARCH_DEBOUNCE_MS,
} from '@/lib/constants';

// ─── 타입 ─────────────────────────────────────────────
interface MspContract {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  stage: string | null;
  totalAmount: number;
  assignedTo: string | null;
  assignedToName: string | null;
  contactName: string | null;
  // msp_details
  mspDetailId: string | null;
  expectedMrr: number | null;
  creditShare: string | null;
  payer: string | null;
  billingMethod: string | null;
  salesRepId: string | null;
  salesRepName: string | null;
  awsAmount: number | null;
  hasManagementFee: boolean;
  tags: string[];
}

interface ColumnDef extends InlineEditColumnBase {
  type: 'text' | 'number' | 'select' | 'dynamic-select' | 'tags';
  options?: readonly string[] | readonly { readonly value: string; readonly label: string }[];
  /** dynamic-select에서 사용할 옵션 키 */
  optionsKey?: string;
  table: 'contracts' | 'msp_details';
  dbColumn?: string;
}

const ALL_COLUMNS: ColumnDef[] = [
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

const ACTIONS_COLUMN: ColumnDef = { key: 'actions', label: '', width: 'w-[90px]', editable: false, type: 'text', table: 'contracts' };

function getStageBadge(stage: string | null) {
  const label = stage ? (MSP_STAGES.find((s) => s.value === stage)?.label ?? stage) : '미지정';
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${getStageColor(stage)}`}>{label}</span>;
}

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

  // 인라인 편집 (공용 훅)
  const inlineEdit = useInlineEdit<MspContract>({
    getId: (c) => c.id,
    getOriginalValue: (c, key) => String(c[key as keyof MspContract] ?? ''),
    getChangeDefaults: (c) => ({ contractId: c.id, mspDetailId: c.mspDetailId }),
    onSave: async (changes) => {
      const supabase = createClient();

      // DB 저장
      const promises = Array.from(changes.values()).map((change) => {
        const contractUpdate: Record<string, unknown> = {};
        const mspUpdate: Record<string, unknown> = {};
        ALL_COLUMNS.forEach((col) => {
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
        if (Object.keys(mspUpdate).length > 0) {
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

      // 변경이력 기록
      if (currentUser) {
        const contracts = tableContracts?.data ?? [];
        const historyPromises = Array.from(changes.entries()).map(([contractId, change]) => {
          const original = contracts.find((c) => c.id === contractId);
          if (!original) return Promise.resolve();
          const fieldChanges: { field: string; oldValue: string | null; newValue: string | null }[] = [];
          ALL_COLUMNS.forEach((col) => {
            if (!col.editable || !col.dbColumn || !(col.key in change)) return;
            let oldVal = String(original[col.key as keyof MspContract] ?? '') || null;
            let newVal = String(change[col.key] ?? '') || null;
            if (col.type === 'dynamic-select' && col.optionsKey) {
              const opts = dynamicOptions[col.optionsKey] ?? [];
              if (oldVal) oldVal = opts.find((o) => o.value === oldVal)?.label ?? oldVal;
              if (newVal) newVal = opts.find((o) => o.value === newVal)?.label ?? newVal;
            }
            if (col.key === 'stage') {
              const stageOpts = MSP_STAGES as readonly { readonly value: string; readonly label: string }[];
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

      queryClient.invalidateQueries({ queryKey: ['msp-contracts-table'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
  });

  const basePath = useSectionBasePath();
  const { editMode, tempValue, setTempValue, saveCellEdit, setEditingCell } = inlineEdit;

  const configurableKeys = useMemo(() => new Set(ALL_COLUMNS.map((c) => c.key)), []);
  const defaultCols = useMemo(() => ALL_COLUMNS.map((c) => c.key), []);
  const { columns: rawVisibleColumns, saveColumns } = useColumnPreference('mspContractsColumns', defaultCols);
  // 저장된 설정에서 actions 등 유효하지 않은 키 제거
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

  // 직원 목록 (dynamic-select 옵션용 — 영업 담당 + 사내 담당 모두 employees 사용)
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

      let q = supabase
        .from('contracts')
        .select(`
          *,
          clients!contracts_client_id_fkey(name),
          profiles!contracts_assigned_to_fkey(name),
          contacts!contracts_contact_id_fkey(name),
          contract_msp_details(*, employees!contract_msp_details_sales_rep_id_fkey(name))
        `, { count: 'exact' })
        .eq('type', 'msp')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (stage) q = q.eq('stage', stage);
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`);

      q = q.range(from, to);

      const { data, count, error } = await q;
      if (error) throw error;

      const mapped = (data ?? []).map((row: Record<string, unknown>): MspContract => {
        const mspRaw = Array.isArray(row.contract_msp_details)
          ? (row.contract_msp_details as Record<string, unknown>[])[0]
          : (row.contract_msp_details as Record<string, unknown> | null);
        const emp = mspRaw?.employees as { name: string } | null;

        return {
          id: row.id as string,
          name: row.name as string,
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
          hasManagementFee: (mspRaw?.has_management_fee as boolean) ?? false,
          tags: (mspRaw?.tags as string[] | null) ?? [],
        };
      });

      return {
        data: mapped,
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
    },
    enabled: viewMode === 'table',
  });

  const columns = useMemo(() => {
    const colMap = new Map(ALL_COLUMNS.map((c) => [c.key, c]));
    const cols = visibleColumns.map((key) => colMap.get(key)).filter(Boolean) as ColumnDef[];
    cols.push(ACTIONS_COLUMN);
    return cols;
  }, [visibleColumns]);

  // ID → 이름 변환 (dynamic-select 컬럼용)
  function resolveDisplayName(value: string, col: ColumnDef): string {
    if (col.type !== 'dynamic-select' || !value) return value;
    const opts = dynamicOptions[col.optionsKey ?? ''] ?? [];
    return opts.find((o) => o.value === value)?.label ?? value;
  }

  // 셀 값 렌더 (배지/칩 등 특수 표현 포함)
  function renderCellValue(row: MspContract, col: ColumnDef, displayValue: string) {
    if (col.key === 'name') return row.name;
    if (col.key === 'clientName' && row.clientId) {
      return (
        <Link
          href={`${basePath}/clients/${row.clientId}`}
          onClick={(e) => e.stopPropagation()}
          className="font-medium text-blue-600 hover:underline"
        >
          {row.clientName ?? '-'}
        </Link>
      );
    }
    if (col.key === 'actions') {
      return (
        <Link
          href={`${basePath}/contracts/${row.id}`}
          className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors"
        >
          상세보기
        </Link>
      );
    }
    if (col.key === 'stage') return getStageBadge(displayValue || null);
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
    return displayValue || '-';
  }

  function getSelectOptions(col: ColumnDef): { value: string; label: string }[] {
    if (!col.options) return [];
    const opts = col.options as readonly unknown[];
    if (opts.length === 0) return [];
    if (typeof opts[0] === 'string') {
      return (opts as readonly string[]).map((o) => ({ value: o, label: o }));
    }
    return [...(opts as readonly { readonly value: string; readonly label: string }[])];
  }

  // 편집 중 셀 렌더
  function renderEditingCell(row: MspContract, col: ColumnDef) {
    if (col.type === 'select') {
      const opts = getSelectOptions(col);
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
    if (col.type === 'dynamic-select') {
      const opts = dynamicOptions[col.optionsKey ?? ''] ?? [];
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
      <h1 className="text-2xl font-semibold text-zinc-900">MSP 계약</h1>

      {/* 필터 바 */}
      <div className="flex items-center gap-2">
        {/* 뷰 모드 토글 */}
        <div className="flex overflow-hidden rounded-lg border border-zinc-200">
          <button
            type="button"
            onClick={() => handleViewChange('kanban')}
            className={cn(
              'h-8 px-3.5 text-[13px] font-medium transition-colors',
              viewMode === 'kanban' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50',
            )}
          >
            칸반
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('table')}
            className={cn(
              'h-8 px-3.5 text-[13px] font-medium transition-colors',
              viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-50',
            )}
          >
            테이블
          </button>
        </div>

        {/* 테이블 뷰 전용: 컬럼 설정 + 편집 모드 */}
        {viewMode === 'table' && (
          <>
            <ColumnSettings
              allColumns={ALL_COLUMNS.map((c) => ({ key: c.key, label: c.label }))}
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
          contractType="msp"
          stage={stage}
          onStageChange={(v) => { setStage(v); setPage(1); }}
        />

        <div className="flex-1" />

        <ContractSearch search={search} onSearchChange={handleSearchChange} />

        {/* 편집 모드 액션 (테이블 뷰에서만) */}
        {viewMode === 'table' && <InlineEditActions inlineEdit={inlineEdit} />}

        {/* 새 계약 */}
        {editMode ? (
          <button disabled className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white opacity-40 cursor-not-allowed">
            <Plus className="h-4 w-4" />
            새 계약
          </button>
        ) : (
          <Link href="/msp/contracts/new">
            <Button className="h-9 gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              새 계약
            </Button>
          </Link>
        )}
      </div>

      {/* 뷰 */}
      {viewMode === 'kanban' ? (
        <ContractKanban
          contracts={kanbanData?.data ?? []}
          loading={kanbanLoading}
          contractType="msp"
        />
      ) : (
        <>
          <InlineEditTable<MspContract, ColumnDef>
            data={tableContracts?.data ?? []}
            columns={columns}
            inlineEdit={inlineEdit}
            getId={(c) => c.id}
            isLoading={tableLoading}
            skeletonRows={5}
            emptyText="등록된 MSP 계약이 없습니다"
            renderCell={renderCellValue}
            renderEditingCell={renderEditingCell}
          />

          {tableContracts && tableContracts.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-zinc-500">{page} / {tableContracts.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= tableContracts.totalPages}>
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

function InlineTagSelect({ value, onChange, onDone }: { value: string; onChange: (v: string) => void; onDone: () => void }) {
  const selected = value.split(',').map((s) => s.trim()).filter(Boolean);

  function toggle(tag: string) {
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    onChange(next.join(', '));
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 rounded border border-blue-400 bg-blue-50 px-2 py-1.5 min-h-[32px]">
        {MSP_TAG_OPTIONS.map((tag) => {
          const active = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggle(tag)}
              className={`rounded px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                active ? 'bg-blue-600 text-white' : 'bg-white text-zinc-500 border border-zinc-200'
              }`}
            >
              {tag}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onDone}
          className="ml-auto rounded bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-700"
        >
          완료
        </button>
      </div>
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

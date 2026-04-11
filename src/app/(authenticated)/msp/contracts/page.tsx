'use client';

import { Suspense, useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn, formatAmount, safeNumber, getStageColor } from '@/lib/utils';
import { ContractStageFilter, ContractSearch } from '@/components/contracts/contract-filters';
import { ContractKanban } from '@/components/contracts/contract-kanban';
import { ColumnSettings } from '@/components/common/column-settings';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
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
}

interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  editable: boolean;
  type: 'text' | 'number' | 'select' | 'dynamic-select';
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
];

// ─── 변경사항 ──────────────────────────────────────────
type PendingChange = {
  contractId: string;
  mspDetailId: string | null;
  [key: string]: unknown;
};

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

  // 인라인 편집 (공용 훅) — onSave는 아래에서 tableContracts 접근 필요하므로 별도 정의
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
          const dbVal = col.type === 'number' ? safeNumber(val) : val;
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

  const { editMode, setEditMode, changeCount, saving, editingCell, tempValue, setTempValue,
    startCellEdit, saveCellEdit, getDisplayValue, handleSave, handleCancelEdit, setEditingCell, pendingChanges } = inlineEdit;

  const defaultCols = useMemo(() => ALL_COLUMNS.map((c) => c.key), []);
  const { columns: visibleColumns, saveColumns } = useColumnPreference('mspContractsColumns', defaultCols);
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
        .order('created_at', { ascending: false })
        .range(from, to);

      if (stage) q = q.eq('stage', stage);

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
        };
      });

      // 클라이언트 검색
      const filtered = debouncedSearch
        ? mapped.filter((c) => {
            const s = debouncedSearch.toLowerCase();
            return c.name.toLowerCase().includes(s) || (c.clientName ?? '').toLowerCase().includes(s);
          })
        : mapped;

      return {
        data: filtered,
        total: debouncedSearch ? filtered.length : (count ?? 0),
        page,
        pageSize,
        totalPages: debouncedSearch ? 1 : Math.ceil((count ?? 0) / pageSize),
      };
    },
    enabled: viewMode === 'table',
  });

  const columns = useMemo(() => {
    const colMap = new Map(ALL_COLUMNS.map((c) => [c.key, c]));
    return visibleColumns.map((key) => colMap.get(key)).filter(Boolean) as ColumnDef[];
  }, [visibleColumns]);

  // ID → 이름 변환 (dynamic-select 컬럼용)
  function resolveDisplayName(value: string, col: ColumnDef): string {
    if (col.type !== 'dynamic-select' || !value) return value;
    const opts = dynamicOptions[col.optionsKey ?? ''] ?? [];
    return opts.find((o) => o.value === value)?.label ?? value;
  }

  // ─── 셀 렌더링 ─────────────────────────────────────
  function renderCellValue(value: string, col: ColumnDef) {
    if (col.key === 'stage') return getStageBadge(value || null);
    if (col.key === 'creditShare' && value) {
      return <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">{value}</span>;
    }
    if (col.type === 'number' && value) return formatAmount(Number(value));
    if (col.type === 'dynamic-select') return resolveDisplayName(value, col) || '-';
    return value || '-';
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

  function renderEditingCell(contract: MspContract, col: ColumnDef) {
    if (col.type === 'select') {
      const opts = getSelectOptions(col);
      return (
        <select
          autoFocus
          value={tempValue}
          onChange={(e) => { setTempValue(e.target.value); }}
          onBlur={() => saveCellEdit(contract)}
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
          onChange={(e) => { setTempValue(e.target.value); }}
          onBlur={() => saveCellEdit(contract)}
          className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-1 text-[13px] text-zinc-900 outline-none"
        >
          <option value="">미지정</option>
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    return (
      <input
        autoFocus
        type="text"
        inputMode={col.type === 'number' ? 'numeric' : undefined}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => saveCellEdit(contract)}
        onKeyDown={(e) => { if (e.key === 'Enter') saveCellEdit(contract); if (e.key === 'Escape') setEditingCell(null); }}
        className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-2 text-[13px] text-zinc-900 outline-none"
      />
    );
  }

  // ─── 테이블 뷰 렌더링 ──────────────────────────────
  function renderTableView() {
    const contracts = tableContracts?.data ?? [];
    const isLoading = tableLoading;

    return (
      <>
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : (
          <div className={cn('overflow-hidden rounded-xl border', editMode ? 'border-blue-600' : 'border-zinc-200')}>
            <Table>
              <TableHeader>
                <TableRow className={editMode ? 'bg-blue-50' : 'bg-zinc-50'}>
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        'h-10 px-4 text-xs font-semibold',
                        col.width,
                        col.key === 'name' ? 'text-left' : 'text-center',
                        editMode ? 'text-blue-600' : 'text-zinc-500',
                      )}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-400">
                      등록된 MSP 계약이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  contracts.map((c) => (
                    <TableRow
                      key={c.id}
                      tabIndex={editMode ? undefined : 0}
                      className={cn('h-11 border-b border-zinc-100', !editMode && 'cursor-pointer hover:bg-zinc-50')}
                      onClick={editMode ? undefined : () => router.push(`/msp/contracts/${c.id}`)}
                      onKeyDown={editMode ? undefined : (e) => { if (e.key === 'Enter') router.push(`/msp/contracts/${c.id}`); }}
                    >
                      {columns.map((col) => {
                        const displayValue = getDisplayValue(c, col.key);
                        const canEdit = editMode && col.editable;
                        const isEditing = editingCell?.rowId === c.id && editingCell?.colKey === col.key;
                        const isChanged = pendingChanges.has(c.id) && col.key in (pendingChanges.get(c.id) ?? {});

                        if (isEditing) {
                          return (
                            <TableCell key={col.key} className={cn('px-2', col.width)}>
                              {renderEditingCell(c, col)}
                            </TableCell>
                          );
                        }

                        if (canEdit) {
                          return (
                            <TableCell
                              key={col.key}
                              className={cn('px-2', col.width)}
                              onClick={(e) => { e.stopPropagation(); startCellEdit(c.id, col.key, displayValue === '-' ? '' : displayValue); }}
                            >
                              <span className={cn(
                                'block cursor-text rounded border px-3 py-1 text-center text-[13px]',
                                isChanged ? 'border-blue-400 bg-blue-100/50 text-zinc-900' : 'border-blue-200 bg-[#FAFCFF] text-zinc-500',
                              )}>
                                {col.type === 'number' && displayValue && displayValue !== '-'
                                  ? formatAmount(Number(displayValue))
                                  : renderCellValue(displayValue, col)}
                              </span>
                            </TableCell>
                          );
                        }

                        return (
                          <TableCell
                            key={col.key}
                            className={cn(
                              'px-4',
                              col.width,
                              col.key === 'name' ? 'text-sm font-medium text-zinc-900' : 'text-center text-[13px] text-zinc-500',
                            )}
                          >
                            {renderCellValue(displayValue, col)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

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

            <button
              type="button"
              onClick={() => {
                if (!editMode) {
                  setEditMode(true);
                } else if (changeCount > 0) {
                  if (confirm('저장하지 않은 변경사항이 있습니다. 취소하시겠습니까?')) {
                    handleCancelEdit();
                  }
                } else {
                  setEditMode(false);
                }
              }}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors',
                editMode ? 'bg-blue-50 text-blue-600 border border-blue-600' : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50',
              )}
            >
              편집 모드
              <div className={cn('flex h-[18px] w-8 items-center rounded-full px-0.5 transition-colors', editMode ? 'bg-blue-600 justify-end' : 'bg-zinc-300 justify-start')}>
                <div className="h-3.5 w-3.5 rounded-full bg-white" />
              </div>
            </button>
          </>
        )}

        <ContractStageFilter
          contractType="msp"
          stage={stage}
          onStageChange={(v) => { setStage(v); setPage(1); }}
        />

        <div className="flex-1" />

        <ContractSearch search={search} onSearchChange={handleSearchChange} />

        {/* 편집 모드 액션 버튼 */}
        {viewMode === 'table' && editMode && changeCount > 0 && (
          <span className="text-xs text-blue-600">{changeCount}건 변경</span>
        )}
        {viewMode === 'table' && editMode && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex h-8 items-center rounded-md border border-zinc-200 px-3 text-[13px] text-zinc-500 hover:bg-zinc-50"
          >
            취소
          </button>
        )}
        {viewMode === 'table' && editMode && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-8 items-center rounded-md bg-blue-600 px-3 text-[13px] font-semibold text-white hover:bg-blue-700"
          >
            {saving ? '저장 중...' : changeCount > 0 ? `저장 (${changeCount}건)` : '편집 완료'}
          </button>
        )}

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
        renderTableView()
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

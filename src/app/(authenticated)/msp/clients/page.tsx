'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ColumnSettings } from '@/components/common/column-settings';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInlineEdit } from '@/hooks/use-inline-edit';
import { useColumnPreference } from '@/hooks/use-user-preferences';
import { SEARCH_DEBOUNCE_MS, INDUSTRY_OPTIONS } from '@/lib/constants';

interface MspClient {
  id: string;
  name: string;
  mspDetailId: string | null;
  contractCount: number;
  industry: string | null;
  memo: string | null;
}

interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  editable: boolean;
  type?: 'text' | 'select';
  options?: readonly string[];
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: '고객명', editable: false },
  { key: 'industry', label: '산업분야', width: 'w-[110px]', editable: true, type: 'select', options: INDUSTRY_OPTIONS },
  { key: 'contractCount', label: '계약 수', width: 'w-[80px]', editable: false },
  { key: 'memo', label: '메모', editable: true, type: 'text' },
];

export default function MspClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 인라인 편집 (공용 훅)
  const inlineEdit = useInlineEdit<MspClient>({
    getId: (c) => c.id,
    getOriginalValue: (c, key) => String(c[key as keyof MspClient] ?? ''),
    getChangeDefaults: (c) => ({ mspDetailId: c.mspDetailId, clientId: c.id }),
    onSave: async (changes) => {
      const supabase = createClient();
      const promises = Array.from(changes.values()).map((change) => {
        const updateData: Record<string, unknown> = {};
        if ('industry' in change) updateData.industry = change.industry || null;
        if ('memo' in change) updateData.memo = change.memo || null;
        if (Object.keys(updateData).length === 0) return Promise.resolve();
        if (change.mspDetailId) {
          return supabase.from('client_msp_details').update(updateData).eq('id', change.mspDetailId as string)
            .then(({ error }) => { if (error) throw error; });
        }
        return supabase.from('client_msp_details').insert({ client_id: change.clientId as string, ...updateData })
          .then(({ error }) => { if (error) throw error; });
      });
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['msp-clients'] });
    },
  });

  const { editMode, setEditMode, changeCount, saving, editingCell, tempValue, setTempValue,
    startCellEdit, saveCellEdit, getDisplayValue, handleSave, handleCancelEdit, setEditingCell, pendingChanges } = inlineEdit;

  const defaultCols = useMemo(() => ALL_COLUMNS.map((c) => c.key), []);
  const { columns: visibleColumns, saveColumns } = useColumnPreference('mspClientsColumns', defaultCols);
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(value), SEARCH_DEBOUNCE_MS);
  }, []);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['msp-clients', debouncedSearch],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from('clients')
        .select('id, name, client_msp_details(id, industry, memo)')
        .contains('business_types', ['msp'])
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`);
      const { data, error } = await q;
      if (error) throw error;

      const { data: contractCounts } = await supabase
        .from('contracts').select('client_id').eq('type', 'msp').is('deleted_at', null);
      const countMap = new Map<string, number>();
      (contractCounts ?? []).forEach((c) => countMap.set(c.client_id, (countMap.get(c.client_id) ?? 0) + 1));

      return (data ?? []).map((c): MspClient => {
        const msp = (Array.isArray(c.client_msp_details) ? c.client_msp_details[0] : c.client_msp_details) as
          | { id: string; industry: string | null; memo: string | null }
          | null;
        return {
          id: c.id,
          name: c.name,
          mspDetailId: msp?.id ?? null,
          contractCount: countMap.get(c.id) ?? 0,
          industry: msp?.industry ?? null,
          memo: msp?.memo ?? null,
        };
      });
    },
  });

  const columns = useMemo(() => {
    const colMap = new Map(ALL_COLUMNS.map((c) => [c.key, c]));
    return visibleColumns.map((key) => colMap.get(key)).filter(Boolean) as ColumnDef[];
  }, [visibleColumns]);

  function renderCellValue(client: MspClient, col: ColumnDef) {
    if (col.key === 'memo') {
      if (!client.memo) return <span className="text-zinc-400">-</span>;
      return <span className="line-clamp-1" title={client.memo}>{client.memo}</span>;
    }
    const value = col.key === 'industry' ? (client.industry ?? '') : '';
    return value || <span className="text-zinc-400">-</span>;
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">MSP 고객</h1>

      {/* 필터 바 */}
      <div className="flex items-center gap-2">
        {/* 컬럼 설정 */}
        <ColumnSettings
          allColumns={ALL_COLUMNS.map((c) => ({ key: c.key, label: c.label }))}
          visibleColumns={visibleColumns}
          onColumnsChange={saveColumns}
          open={showColumnSettings}
          onOpenChange={setShowColumnSettings}
          fixedColumns={['name']}
        />

        {/* 편집 모드 토글 */}
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

        <div className="flex-1" />

        {/* 검색 */}
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input placeholder="고객명 검색..." value={search} onChange={(e) => handleSearch(e.target.value)} className="h-8 rounded-md border-zinc-200 pl-9 text-[13px]" />
        </div>

        {/* 편집 액션 */}
        {editMode && changeCount > 0 && (
          <span className="text-xs text-blue-600">{changeCount}건 변경</span>
        )}
        {editMode && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="flex h-8 items-center rounded-md border border-zinc-200 px-3 text-[13px] text-zinc-500 hover:bg-zinc-50"
          >
            취소
          </button>
        )}
        {editMode && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex h-8 items-center rounded-md bg-blue-600 px-3 text-[13px] font-semibold text-white hover:bg-blue-700"
          >
            {saving ? '저장 중...' : changeCount > 0 ? `저장 (${changeCount}건)` : '편집 완료'}
          </button>
        )}

        {/* 새 고객 */}
        {editMode ? (
          <button disabled className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white opacity-40 cursor-not-allowed">
            <Plus className="h-4 w-4" />
            새 고객
          </button>
        ) : (
          <Link href="/msp/clients/new">
            <button className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              새 고객
            </button>
          </Link>
        )}
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
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
              {(!clients || clients.length === 0) ? (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-zinc-400">MSP 고객이 없습니다</TableCell></TableRow>
              ) : (
                clients.map((c) => (
                  <TableRow
                    key={c.id}
                    tabIndex={editMode ? undefined : 0}
                    className={cn('h-11 border-b border-zinc-100', !editMode && 'cursor-pointer hover:bg-zinc-50')}
                    onClick={editMode ? undefined : () => router.push(`/msp/clients/${c.id}`)}
                    onKeyDown={editMode ? undefined : (e) => { if (e.key === 'Enter') router.push(`/msp/clients/${c.id}`); }}
                  >
                    {columns.map((col) => {
                      const displayValue = getDisplayValue(c, col.key);
                      const canEdit = editMode && col.editable;
                      const isEditing = editingCell?.rowId === c.id && editingCell?.colKey === col.key;
                      const isChanged = pendingChanges.has(c.id) && col.key in (pendingChanges.get(c.id) ?? {});

                      // 현재 편집 중인 셀
                      if (isEditing) {
                        if (col.type === 'select' && col.options) {
                          return (
                            <TableCell key={col.key} className={cn('px-2', col.width)}>
                              <select
                                autoFocus
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => saveCellEdit(c)}
                                className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-1 text-[13px] text-zinc-900 outline-none"
                              >
                                <option value="">미지정</option>
                                {col.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </TableCell>
                          );
                        }
                        return (
                          <TableCell key={col.key} className={cn('px-2', col.width)}>
                            <input
                              autoFocus
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onBlur={() => saveCellEdit(c)}
                              onKeyDown={(e) => { if (e.nativeEvent.isComposing) return; if (e.key === 'Enter') saveCellEdit(c); if (e.key === 'Escape') setEditingCell(null); }}
                              className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-2 text-[13px] text-zinc-900 outline-none"
                            />
                          </TableCell>
                        );
                      }

                      // 편집 모드 ON + 편집 가능 셀 (클릭 대기)
                      if (canEdit) {
                        const displayText = displayValue;
                        return (
                          <TableCell
                            key={col.key}
                            className={cn('px-2', col.width)}
                            onClick={(e) => { e.stopPropagation(); startCellEdit(c.id, col.key, displayText); }}
                          >
                            <span className={cn(
                              'block cursor-text rounded border px-3 py-1 text-left text-[13px] truncate',
                              isChanged ? 'border-blue-400 bg-blue-100/50 text-zinc-900' : 'border-blue-200 bg-[#FAFCFF] text-zinc-500',
                            )}>
                              {displayText || '-'}
                            </span>
                          </TableCell>
                        );
                      }

                      // 일반 셀
                      return (
                        <TableCell
                          key={col.key}
                          className={cn(
                            'px-4',
                            col.width,
                            col.key === 'name' ? 'text-sm font-medium text-zinc-900' : col.key === 'memo' ? 'text-[13px] text-zinc-500' : 'text-center text-[13px] text-zinc-500',
                          )}
                        >
                          {col.key === 'name' ? c.name : col.key === 'contractCount' ? `${c.contractCount}건` : renderCellValue(c, col)}
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
    </div>
  );
}

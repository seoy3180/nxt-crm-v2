'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, GripVertical, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEditMode } from '@/providers/edit-mode-provider';
import { MSP_GRADES, SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { toast } from 'sonner';

interface MspClient {
  id: string;
  name: string;
  mspDetailId: string | null;
  mspGrade: string | null;
  awsAm: string | null;
  contractCount: number;
}

interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  editable: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: '고객명', editable: false },
  { key: 'mspGrade', label: 'MSP 등급', width: 'w-[100px]', editable: true },
  { key: 'awsAm', label: 'AWS AM', width: 'w-[120px]', editable: true },
  { key: 'contractCount', label: '계약 수', width: 'w-[80px]', editable: false },
];

// 변경사항 타입
type PendingChanges = Map<string, { mspDetailId: string | null; clientId: string; mspGrade?: string | null; awsAm?: string | null }>;

export default function MspClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setIsEditing } = useEditMode();
  const [editMode, setEditModeLocal] = useState(false);
  const setEditMode = useCallback((v: boolean) => { setEditModeLocal(v); setIsEditing(v); }, [setIsEditing]);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>(new Map());
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [tempValue, setTempValue] = useState('');

  // 언마운트 시 편집 모드 해제
  useEffect(() => {
    return () => setIsEditing(false);
  }, [setIsEditing]);

  // 저장하지 않고 나갈 때 경고
  useEffect(() => {
    if (editMode && pendingChanges.size > 0) {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [editMode, pendingChanges.size]);

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
        .select('id, name, client_msp_details(id, msp_grade, aws_am)')
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
        const msp = Array.isArray(c.client_msp_details) ? c.client_msp_details[0] : c.client_msp_details;
        return {
          id: c.id,
          name: c.name,
          mspDetailId: (msp as { id: string } | null)?.id ?? null,
          mspGrade: (msp as { msp_grade: string | null } | null)?.msp_grade ?? null,
          awsAm: (msp as { aws_am: string | null } | null)?.aws_am ?? null,
          contractCount: countMap.get(c.id) ?? 0,
        };
      });
    },
  });

  function startCellEdit(rowId: string, colKey: string, value: string) {
    setEditingCell({ rowId, colKey });
    setTempValue(value);
  }

  function saveCellEdit(client: MspClient) {
    if (!editingCell) return;
    const originalValue = String(client[editingCell.colKey as keyof MspClient] ?? '');
    const pendingValue = pendingChanges.get(client.id);
    const currentOriginal = pendingValue && editingCell.colKey in pendingValue
      ? String((pendingValue as Record<string, unknown>)[editingCell.colKey] ?? '')
      : originalValue;

    if (tempValue !== currentOriginal) {
      updatePending(client, editingCell.colKey, tempValue);
    }
    setEditingCell(null);
  }

  // 현재 표시 값 가져오기 (pending 변경이 있으면 그 값, 없으면 원본)
  function getDisplayValue(client: MspClient, key: string): string {
    const change = pendingChanges.get(client.id);
    if (change && key in change) {
      return String((change as Record<string, unknown>)[key] ?? '');
    }
    return String(client[key as keyof MspClient] ?? '');
  }

  // 로컬 변경사항 누적
  function updatePending(client: MspClient, key: string, value: string) {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const existing = next.get(client.id) ?? { mspDetailId: client.mspDetailId, clientId: client.id };
      next.set(client.id, { ...existing, [key]: value || null });
      return next;
    });
  }

  // 편집 모드 끌 때 일괄 저장
  async function handleToggleEditMode() {
    if (editMode && pendingChanges.size > 0) {
      setSaving(true);
      const supabase = createClient();

      try {
        const promises = Array.from(pendingChanges.values()).map((change) => {
          const updateData: Record<string, unknown> = {};
          if ('mspGrade' in change) updateData.msp_grade = change.mspGrade;
          if ('awsAm' in change) updateData.aws_am = change.awsAm;

          if (Object.keys(updateData).length === 0) return Promise.resolve();

          if (change.mspDetailId) {
            return supabase.from('client_msp_details').update(updateData).eq('id', change.mspDetailId);
          }
          return supabase.from('client_msp_details').insert({ client_id: change.clientId, ...updateData });
        });

        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['msp-clients'] });
        toast.success(`${pendingChanges.size}건 저장되었습니다`);
        setPendingChanges(new Map());
        setEditingCell(null);
        setSaving(false);
        setEditMode(false);
        setShowColumnSettings(false);
      } catch {
        toast.error('저장 중 오류가 발생했습니다');
        setSaving(false);
        // editMode, pendingChanges 유지
      }
      return;
    }

    setEditMode(!editMode);
    setShowColumnSettings(false);
  }

  // 편집 취소
  function handleCancelEdit() {
    setPendingChanges(new Map());
    setEditingCell(null);
    setEditMode(false);
    setShowColumnSettings(false);
  }

  function toggleColumn(key: string) {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const columns = ALL_COLUMNS.filter((c) => visibleColumns.includes(c.key));
  const changeCount = pendingChanges.size;

  function renderCellValue(value: string, colKey: string) {
    if (colKey === 'mspGrade' && value && value !== '-') {
      return <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">{value}</span>;
    }
    return value || '-';
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">MSP 고객</h1>

      {/* 필터 바 */}
      <div className="flex items-center gap-2">
        {/* 컬럼 설정 */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColumnSettings(!showColumnSettings)}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
              showColumnSettings ? 'bg-blue-50 text-blue-600 border border-blue-600' : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50',
            )}
          >
            <Columns3 className="h-3.5 w-3.5" />
            컬럼 설정
          </button>
          {showColumnSettings && (
            <div className="absolute left-0 top-10 z-10 w-48 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-zinc-50">
                  <input
                    type="checkbox"
                    checked={visibleColumns.includes(col.key)}
                    onChange={() => toggleColumn(col.key)}
                    disabled={col.key === 'name'}
                    className="rounded"
                  />
                  <span className={col.key === 'name' ? 'text-zinc-400' : 'text-zinc-700'}>{col.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

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
            onClick={handleToggleEditMode}
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
                    <div className={cn('flex items-center gap-1.5', col.key !== 'name' && 'justify-center')}>
                      {editMode && <GripVertical className="h-3 w-3 text-zinc-400" />}
                      {col.label}
                    </div>
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
                    onClick={editMode ? undefined : () => router.push(`/clients/${c.id}`)}
                    onKeyDown={editMode ? undefined : (e) => { if (e.key === 'Enter') router.push(`/clients/${c.id}`); }}
                  >
                    {columns.map((col) => {
                      const displayValue = getDisplayValue(c, col.key);
                      const canEdit = editMode && col.editable;
                      const isEditing = editingCell?.rowId === c.id && editingCell?.colKey === col.key;
                      const isChanged = pendingChanges.has(c.id) && col.key in (pendingChanges.get(c.id) ?? {});

                      // 현재 편집 중인 셀
                      if (isEditing) {
                        return (
                          <TableCell key={col.key} className={cn('px-2', col.width)}>
                            {col.key === 'mspGrade' ? (
                              <select
                                autoFocus
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => saveCellEdit(c)}
                                className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-1 text-[13px] text-zinc-900 outline-none"
                              >
                                <option value="">미지정</option>
                                {MSP_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                              </select>
                            ) : (
                              <input
                                autoFocus
                                value={tempValue}
                                onChange={(e) => setTempValue(e.target.value)}
                                onBlur={() => saveCellEdit(c)}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveCellEdit(c); if (e.key === 'Escape') setEditingCell(null); }}
                                className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-2 text-[13px] text-zinc-900 outline-none"
                              />
                            )}
                          </TableCell>
                        );
                      }

                      // 편집 모드 ON + 편집 가능 셀 (클릭 대기)
                      if (canEdit) {
                        return (
                          <TableCell
                            key={col.key}
                            className={cn('px-2', col.width)}
                            onClick={(e) => { e.stopPropagation(); startCellEdit(c.id, col.key, displayValue); }}
                          >
                            <span className={cn(
                              'block cursor-text rounded border px-3 py-1 text-center text-[13px]',
                              isChanged ? 'border-blue-400 bg-blue-100/50 text-zinc-900' : 'border-blue-200 bg-[#FAFCFF] text-zinc-500',
                            )}>
                              {displayValue || '-'}
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
                            col.key === 'name' ? 'text-sm font-medium text-zinc-900' : 'text-center text-[13px] text-zinc-500',
                          )}
                        >
                          {renderCellValue(displayValue, col.key)}
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

'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
// useEffect, useEditMode는 useInlineEdit 훅 내부에서 처리
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Search, Plus, ChevronsUpDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ColumnSettings } from '@/components/common/column-settings';
import { useClients } from '@/hooks/use-clients';
import { useInlineEdit } from '@/hooks/use-inline-edit';
import { useColumnPreference } from '@/hooks/use-user-preferences';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { toast } from 'sonner';

// ─── 타입 ─────────────────────────────────────────────
interface MspContact {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  department: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
}

interface ColumnDef {
  key: string;
  label: string;
  width?: string;
  editable: boolean;
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'name', label: '이름', editable: true },
  { key: 'clientName', label: '고객사', width: 'w-[140px]', editable: false },
  { key: 'department', label: '부서', width: 'w-[100px]', editable: true },
  { key: 'position', label: '직책', width: 'w-[100px]', editable: true },
  { key: 'phone', label: '전화', width: 'w-[140px]', editable: true },
  { key: 'email', label: '이메일', width: 'w-[180px]', editable: true },
];

const DB_COLUMN_MAP: Record<string, string> = {
  name: 'name',
  department: 'department',
  position: 'position',
  phone: 'phone',
  email: 'email',
};

const PAGE_SIZE = 20;

export default function MspContactsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 인라인 편집 (공용 훅)
  const inlineEdit = useInlineEdit<MspContact>({
    getId: (c) => c.id,
    getOriginalValue: (c, key) => String(c[key as keyof MspContact] ?? ''),
    getChangeDefaults: (c) => ({ contactId: c.id }),
    onSave: async (changes) => {
      const supabase = createClient();
      const promises = Array.from(changes.values()).map((change) => {
        const updateData: Record<string, unknown> = {};
        ALL_COLUMNS.forEach((col) => {
          if (!col.editable || !(col.key in change)) return;
          const dbCol = DB_COLUMN_MAP[col.key];
          if (dbCol) updateData[dbCol] = change[col.key];
        });
        if (Object.keys(updateData).length === 0) return Promise.resolve();
        return supabase.from('contacts').update(updateData).eq('id', change.contactId as string)
          .then(({ error }) => { if (error) throw error; });
      });
      await Promise.all(promises);
      queryClient.invalidateQueries({ queryKey: ['msp-contacts'] });
    },
  });

  const { editMode, setEditMode, changeCount, saving, editingCell, tempValue, setTempValue,
    startCellEdit, saveCellEdit, getDisplayValue, handleSave, handleCancelEdit, setEditingCell, pendingChanges } = inlineEdit;

  // 컬럼 설정
  const defaultCols = useMemo(() => ALL_COLUMNS.map((c) => c.key), []);
  const { columns: visibleColumns, saveColumns } = useColumnPreference('mspContactsColumns', defaultCols);
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // 연락처 추가 모달
  const [addOpen, setAddOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', department: '', position: '', phone: '', email: '' });
  const [addLoading, setAddLoading] = useState(false);

  const { data: clientsData } = useClients({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' });
  const mspClients = (clientsData?.data ?? []).filter((c) => c.business_types?.includes('msp'));

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setDebouncedSearch(value); setPage(1); }, SEARCH_DEBOUNCE_MS);
  }, []);

  // ─── 서버 사이드 쿼리 (페이지네이션 + 검색) ─────────────
  const { data: queryResult, isLoading } = useQuery({
    queryKey: ['msp-contacts', debouncedSearch, page],
    queryFn: async () => {
      const supabase = createClient();
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // MSP 고객 ID 목록 먼저 조회
      const { data: mspClientIds } = await supabase
        .from('clients')
        .select('id')
        .contains('business_types', ['msp'])
        .is('deleted_at', null);

      const clientIds = (mspClientIds ?? []).map((c) => c.id);
      if (clientIds.length === 0) return { data: [], total: 0 };

      let q = supabase
        .from('contacts')
        .select('id, name, email, phone, department, position, client_id, clients!contacts_client_id_fkey(name)', { count: 'exact' })
        .in('client_id', clientIds)
        .is('deleted_at', null)
        .order('name', { ascending: true })
        .range(from, to);

      if (debouncedSearch) {
        q = q.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const { data, count, error } = await q;
      if (error) throw error;

      const contacts: MspContact[] = (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        clientName: (c.clients as { name: string } | null)?.name ?? '-',
        clientId: c.client_id,
        department: c.department,
        position: c.position,
        phone: c.phone,
        email: c.email,
      }));

      return { data: contacts, total: count ?? 0 };
    },
  });

  const contacts = queryResult?.data ?? [];
  const totalPages = Math.ceil((queryResult?.total ?? 0) / PAGE_SIZE);

  const columns = useMemo(() => {
    const colMap = new Map(ALL_COLUMNS.map((c) => [c.key, c]));
    return visibleColumns.map((key) => colMap.get(key)).filter(Boolean) as ColumnDef[];
  }, [visibleColumns]);

  // ─── 연락처 추가 ────────────────────────────────────
  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId || !addForm.name.trim()) {
      toast.error('고객과 이름은 필수입니다');
      return;
    }
    setAddLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('contacts').insert({
        client_id: selectedClientId,
        name: addForm.name,
        department: addForm.department || null,
        position: addForm.position || null,
        phone: addForm.phone || null,
        email: addForm.email || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['msp-contacts'] });
      toast.success('연락처가 추가되었습니다');
      setAddOpen(false);
      setSelectedClientId('');
      setSelectedClientName('');
      setAddForm({ name: '', department: '', position: '', phone: '', email: '' });
    } catch (err) {
      const { getErrorMessage } = await import('@/lib/utils');
      toast.error(`연락처 추가 실패: ${getErrorMessage(err)}`);
    }
    setAddLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">MSP 연락처</h1>

      {/* 필터 바 */}
      <div className="flex items-center gap-2">
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

        <div className="flex-1" />

        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input placeholder="이름, 전화, 이메일 검색..." value={search} onChange={(e) => handleSearch(e.target.value)} className="h-8 rounded-md border-zinc-200 pl-9 text-[13px]" />
        </div>

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

        {editMode ? (
          <button disabled className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white opacity-40 cursor-not-allowed">
            <Plus className="h-4 w-4" />
            연락처 추가
          </button>
        ) : (
          <Button onClick={() => setAddOpen(true)} className="h-9 gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            연락처 추가
          </Button>
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
              {contacts.length === 0 ? (
                <TableRow><TableCell colSpan={columns.length} className="h-24 text-center text-zinc-400">등록된 연락처가 없습니다</TableCell></TableRow>
              ) : (
                contacts.map((c) => (
                  <TableRow
                    key={c.id}
                    tabIndex={editMode ? undefined : 0}
                    className={cn('h-11 border-b border-zinc-100', !editMode && 'cursor-pointer hover:bg-zinc-50')}
                    onClick={editMode ? undefined : () => router.push(`/msp/clients/${c.clientId}`)}
                    onKeyDown={editMode ? undefined : (e) => { if (e.key === 'Enter') router.push(`/msp/clients/${c.clientId}`); }}
                  >
                    {columns.map((col) => {
                      const displayValue = getDisplayValue(c, col.key);
                      const canEdit = editMode && col.editable;
                      const isEditing = editingCell?.rowId === c.id && editingCell?.colKey === col.key;
                      const isChanged = pendingChanges.has(c.id) && col.key in (pendingChanges.get(c.id) ?? {});

                      if (isEditing) {
                        return (
                          <TableCell key={col.key} className={cn('px-2', col.width)}>
                            <input
                              autoFocus
                              value={tempValue}
                              onChange={(e) => setTempValue(e.target.value)}
                              onBlur={() => saveCellEdit(c)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveCellEdit(c); if (e.key === 'Escape') setEditingCell(null); }}
                              className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-2 text-[13px] text-zinc-900 outline-none"
                            />
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
                              {displayValue || '-'}
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
                          {displayValue || '-'}
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

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-zinc-500">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 연락처 추가 모달 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>연락처 추가</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4">
            <div className="space-y-1.5">
              <Label>고객 *</Label>
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm hover:bg-zinc-50">
                  <span className={selectedClientId ? 'text-zinc-900' : 'text-zinc-400'}>
                    {selectedClientName || 'MSP 고객 검색...'}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="고객명 검색..." />
                    <CommandList>
                      <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                      <CommandGroup>
                        {mspClients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => { setSelectedClientId(c.id); setSelectedClientName(c.name); setClientPopoverOpen(false); }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', selectedClientId === c.id ? 'opacity-100' : 'opacity-0')} />
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label>이름 *</Label>
              <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="이름" autoFocus />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>부서</Label>
                <Input value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} placeholder="부서" />
              </div>
              <div className="space-y-1.5">
                <Label>직책</Label>
                <Input value={addForm.position} onChange={(e) => setAddForm({ ...addForm, position: e.target.value })} placeholder="직책" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>전화</Label>
                <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="010-0000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>이메일</Label>
                <Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} type="email" placeholder="email@example.com" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
              <Button type="submit" disabled={addLoading} className="bg-blue-600 hover:bg-blue-700">
                {addLoading ? '추가 중...' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

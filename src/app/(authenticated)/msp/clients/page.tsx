'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { ColumnSettings } from '@/components/common/column-settings';
import {
  InlineEditTable,
  type InlineEditColumnBase,
} from '@/components/common/inline-edit-table';
import {
  InlineEditToggle,
  InlineEditActions,
} from '@/components/common/inline-edit-toolbar';
import { Plus, Search } from 'lucide-react';
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

interface ColumnDef extends InlineEditColumnBase {
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

  const { editMode, tempValue, setTempValue, saveCellEdit, setEditingCell } = inlineEdit;

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

  // 셀 렌더 (일반/편집대기 모두 여기로 들어옴)
  function renderCell(client: MspClient, col: ColumnDef, displayValue: string) {
    if (col.key === 'name') return client.name;
    if (col.key === 'contractCount') return `${client.contractCount}건`;
    if (col.key === 'memo') {
      if (!client.memo) return <span className="text-zinc-400">-</span>;
      return <span className="line-clamp-1" title={client.memo}>{client.memo}</span>;
    }
    return displayValue || <span className="text-zinc-400">-</span>;
  }

  // 편집 중 셀 렌더
  function renderEditingCell(client: MspClient, col: ColumnDef) {
    if (col.type === 'select' && col.options) {
      return (
        <select
          autoFocus
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={() => saveCellEdit(client)}
          className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-1 text-[13px] text-zinc-900 outline-none"
        >
          <option value="">미지정</option>
          {col.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );
    }
    return (
      <input
        autoFocus
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={() => saveCellEdit(client)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter') saveCellEdit(client);
          if (e.key === 'Escape') setEditingCell(null);
        }}
        className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-2 text-[13px] text-zinc-900 outline-none"
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">MSP 고객</h1>

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

        <InlineEditToggle inlineEdit={inlineEdit} />

        <div className="flex-1" />

        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="고객명 검색..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-8 rounded-md border-zinc-200 pl-9 text-[13px]"
          />
        </div>

        <InlineEditActions inlineEdit={inlineEdit} />

        {editMode ? (
          <button
            disabled
            className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white opacity-40 cursor-not-allowed"
          >
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

      <InlineEditTable<MspClient, ColumnDef>
        data={clients ?? []}
        columns={columns}
        inlineEdit={inlineEdit}
        getId={(c) => c.id}
        isLoading={isLoading}
        emptyText="MSP 고객이 없습니다"
        rowHref={(c) => `/msp/clients/${c.id}`}
        renderCell={renderCell}
        renderEditingCell={renderEditingCell}
      />
    </div>
  );
}

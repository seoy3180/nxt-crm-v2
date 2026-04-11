'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface TeamAllocation {
  id: string | null; // null = 신규
  teamId: string;
  teamName: string;
  percentage: number;
}

interface RevenueSplitCardProps {
  contractId: string;
}

export function RevenueSplitCard({ contractId }: RevenueSplitCardProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [allocations, setAllocations] = useState<TeamAllocation[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from('teams').select('id, name').order('name');
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: currentAllocations, isLoading } = useQuery({
    queryKey: ['contract-teams', contractId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contract_teams')
        .select('id, team_id, percentage, teams(name)')
        .eq('contract_id', contractId)
        .is('deleted_at', null);
      if (error) throw error;
      return (data ?? []).map((row): TeamAllocation => ({
        id: row.id,
        teamId: row.team_id,
        teamName: (row.teams as { name: string } | null)?.name ?? '-',
        percentage: Number(row.percentage),
      }));
    },
  });

  const displayAllocations = editing ? allocations : (currentAllocations ?? []);
  const totalPercentage = displayAllocations.reduce((sum, a) => sum + (a.percentage || 0), 0);

  function startEdit() {
    setAllocations(currentAllocations ? [...currentAllocations] : []);
    setEditing(true);
  }

  function addRow() {
    setAllocations((prev) => [...prev, { id: null, teamId: '', teamName: '', percentage: 0 }]);
  }

  function removeRow(index: number) {
    setAllocations((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: 'teamId' | 'percentage', value: string) {
    setAllocations((prev) => prev.map((a, i) => {
      if (i !== index) return a;
      if (field === 'teamId') {
        const team = teams?.find((t) => t.id === value);
        return { ...a, teamId: value, teamName: team?.name ?? '' };
      }
      const n = Number(value);
      return { ...a, percentage: Number.isNaN(n) ? 0 : n };
    }));
  }

  async function handleSave() {
    const validAllocations = allocations.filter((a) => a.teamId);
    const total = validAllocations.reduce((sum, a) => sum + (a.percentage || 0), 0);
    if (validAllocations.length > 0 && total !== 100) {
      toast.error(`매출 배분 합계가 ${total}%입니다. 100%가 되어야 합니다.`);
      return;
    }
    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.rpc('update_contract_teams', {
        p_contract_id: contractId,
        p_allocations: JSON.stringify(
          validAllocations.map((a) => ({ team_id: a.teamId, percentage: a.percentage })),
        ),
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['contract-teams', contractId] });
      toast.success('매출 배분이 저장되었습니다');
      setEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      toast.error(`매출 배분 저장 실패: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">매출 배분</h3>
        {editing ? (
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-7 rounded-md border border-zinc-200 px-2.5 text-[12px] text-zinc-500 hover:bg-zinc-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-7 rounded-md bg-blue-600 px-2.5 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEdit}
            className="h-7 rounded-md border border-zinc-200 px-2.5 text-[12px] text-zinc-500 hover:bg-zinc-50"
          >
            편집
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-zinc-400">로딩 중...</p>
      ) : displayAllocations.length === 0 && !editing ? (
        <p className="text-sm text-zinc-400">배분된 팀이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {displayAllocations.map((a, idx) => (
            <div key={a.id ?? `new-${idx}`} className="flex items-center gap-2">
              {editing ? (
                <>
                  <Select value={a.teamId} onValueChange={(v) => updateRow(idx, 'teamId', v)}>
                    <SelectTrigger className="h-8 flex-1 text-[13px]"><SelectValue placeholder="팀 선택" /></SelectTrigger>
                    <SelectContent>
                      {teams?.filter((t) => t.id === a.teamId || !allocations.some((other, otherIdx) => otherIdx !== idx && other.teamId === t.id)).map((t) => {
                        const isDev = t.name === '개발팀';
                        return (
                          <SelectItem key={t.id} value={t.id} disabled={isDev}>
                            {t.name}{isDev ? ' (준비중)' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <div className="flex h-8 w-24 items-center overflow-hidden rounded-md border border-zinc-200">
                    <input
                      value={a.percentage || ''}
                      onChange={(e) => updateRow(idx, 'percentage', e.target.value)}
                      inputMode="numeric"
                      className="h-full w-full border-0 px-2 text-center text-[13px] outline-none"
                    />
                    <span className="shrink-0 bg-zinc-50 px-2 text-[12px] text-zinc-400 border-l border-zinc-200 h-full flex items-center">%</span>
                  </div>
                  <button type="button" onClick={() => removeRow(idx)} className="text-zinc-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-[13px] text-zinc-700">{a.teamName}</span>
                  <span className="text-[13px] font-semibold text-zinc-900">{a.percentage}%</span>
                </>
              )}
            </div>
          ))}

          {editing && (
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-[12px] text-blue-600 hover:underline"
            >
              <Plus className="h-3 w-3" />
              팀 추가
            </button>
          )}

          {/* 합계 */}
          {displayAllocations.length > 0 && (
            <div className="flex items-center justify-between border-t border-zinc-100 pt-2">
              <span className="text-[12px] text-zinc-400">합계</span>
              <span className={`text-[13px] font-semibold ${totalPercentage === 100 ? 'text-green-600' : totalPercentage > 100 ? 'text-red-500' : 'text-amber-500'}`}>
                {totalPercentage}%
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

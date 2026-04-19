'use client';

import { useState } from 'react';
import { useContractHistory } from '@/hooks/use-contract';
import { useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

interface StageHistoryProps {
  contractId: string;
  contractType: string;
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '계약 생성';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}



function renderChange(h: { field_name: string | null; old_value: string | null; new_value: string | null; from_stage: string | null; to_stage: string | null }, contractType: string) {
  if (h.field_name === 'stage' || (!h.field_name && h.to_stage)) {
    const from = h.old_value ?? h.from_stage;
    const to = h.new_value ?? h.to_stage;
    return (
      <span>
        <span className="text-zinc-400">단계</span>{' '}
        {from ? `${getStageLabel(from, contractType)} → ` : ''}
        <span className="font-semibold">{getStageLabel(to, contractType)}</span>
      </span>
    );
  }

  return (
    <span>
      <span className="text-zinc-400">{h.field_name}</span>{' '}
      {h.old_value ? `${h.old_value} → ` : ''}
      <span className="font-semibold">{h.new_value || '(삭제)'}</span>
    </span>
  );
}

function renderChangeSummary(h: { field_name: string | null; old_value: string | null; new_value: string | null; from_stage: string | null; to_stage: string | null }, contractType: string): string {
  if (h.field_name === 'stage' || (!h.field_name && h.to_stage)) {
    const from = h.old_value ?? h.from_stage;
    const to = h.new_value ?? h.to_stage;
    return `단계 ${from ? `${getStageLabel(from, contractType)} → ` : ''}${getStageLabel(to, contractType)}`;
  }
  return `${h.field_name} ${h.old_value ? `${h.old_value} → ` : ''}${h.new_value || '(삭제)'}`;
}

export function StageHistory({ contractId, contractType }: StageHistoryProps) {
  const queryClient = useQueryClient();
  const { data: history, isLoading } = useContractHistory(contractId);
  const [open, setOpen] = useState(false);

  async function handleDelete(historyId: string) {
    try {
      await contractService.deleteHistoryEntry(historyId);
      queryClient.invalidateQueries({ queryKey: ['contract-history', contractId] });
    } catch (err) {
      toast.error(`삭제 실패: ${getErrorMessage(err)}`);
    }
  }

  if (isLoading) return <Skeleton className="h-12 w-full rounded-xl" />;

  const count = history?.length ?? 0;

  return (
    <div className="rounded-xl border border-zinc-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-zinc-900">변경 이력</h3>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">{count}건</span>
          </div>
          {history && history.length > 0 && (
            <p className="mt-0.5 truncate text-[12px] text-zinc-400">
              마지막: {history[0]!.changed_by_name ?? '알 수 없음'} · {renderChangeSummary(history[0]!, contractType)}
            </p>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 shrink-0 text-zinc-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />}
      </button>
      {open && (
        <div className="border-t px-5 pb-4">
          {count === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-400">변경 이력이 없습니다</p>
          ) : (
            <ScrollArea className="mt-3 h-[360px] pr-4" type="always">
              {history!.map((h, idx) => (
                <div key={h.id} className={`flex items-center justify-between gap-2 py-3 ${idx < count - 1 ? 'border-b border-zinc-100' : ''}`}>
                  <div className="space-y-1 min-w-0">
                    <p className="text-[13px] font-medium text-zinc-900">
                      {renderChange(h, contractType)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {h.changed_by_name ?? '알 수 없음'} · {formatDate(h.created_at)}
                    </p>
                    {h.note && <p className="text-xs text-zinc-500">{h.note}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(h.id)}
                    className="shrink-0 rounded-md px-3 py-1.5 text-[12px] text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </ScrollArea>
          )}
        </div>
      )}
    </div>
  );
}

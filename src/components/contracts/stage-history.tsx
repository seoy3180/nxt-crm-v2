'use client';

import { useContractHistory } from '@/hooks/use-contract';
import { Skeleton } from '@/components/ui/skeleton';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';

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
  // stage 변경 (기존 호환)
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

  // 범용 필드 변경
  return (
    <span>
      <span className="text-zinc-400">{h.field_name}</span>{' '}
      {h.old_value ? `${h.old_value} → ` : ''}
      <span className="font-semibold">{h.new_value || '(삭제)'}</span>
    </span>
  );
}

export function StageHistory({ contractId, contractType }: StageHistoryProps) {
  const { data: history, isLoading } = useContractHistory(contractId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex-1 rounded-xl border border-zinc-200 p-5">
      <h3 className="text-lg font-semibold text-zinc-900">변경 이력</h3>
      {(!history || history.length === 0) ? (
        <p className="mt-4 text-sm text-zinc-400">변경 이력이 없습니다</p>
      ) : (
        <div className="mt-4 space-y-3">
          {history.map((h, idx) => (
            <div key={h.id} className={`space-y-1 ${idx < history.length - 1 ? 'border-b border-zinc-100 pb-3' : ''}`}>
              <p className="text-[13px] font-medium text-zinc-900">
                {renderChange(h, contractType)}
              </p>
              <p className="text-xs text-zinc-400">
                {h.changed_by_name ?? '알 수 없음'} · {formatDate(h.created_at)}
              </p>
              {h.note && <p className="text-xs text-zinc-500">{h.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

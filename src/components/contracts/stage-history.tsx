'use client';

import { useContractHistory } from '@/hooks/use-contract';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';

interface StageHistoryProps {
  contractId: string;
  contractType: string;
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '미지정';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function StageHistory({ contractId, contractType }: StageHistoryProps) {
  const { data: history, isLoading } = useContractHistory(contractId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">변경 이력</CardTitle></CardHeader>
      <CardContent>
        {(!history || history.length === 0) ? (
          <p className="text-sm text-muted-foreground">변경 이력이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 border-l-2 border-border pl-4 pb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {h.from_stage && (
                      <>
                        <Badge variant="outline" className="text-xs">{getStageLabel(h.from_stage, contractType)}</Badge>
                        <span className="text-xs text-muted-foreground">→</span>
                      </>
                    )}
                    <Badge variant="secondary" className="text-xs">{getStageLabel(h.to_stage, contractType)}</Badge>
                  </div>
                  {h.note && <p className="mt-1 text-xs text-muted-foreground">{h.note}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {h.changed_by_name ?? '알 수 없음'} · {formatDate(h.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

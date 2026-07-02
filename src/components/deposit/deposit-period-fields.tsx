'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  error?: string | null;
}

export function DepositPeriodFields({ startDate, endDate, onStartChange, onEndChange, error }: Props) {
  function handleStartChange(v: string) {
    onStartChange(v);
    if (!v) onEndChange('');
  }

  return (
    <div className="space-y-1.5">
      <Label>계약 기간 (선택)</Label>
      <div className="flex items-center gap-2">
        <Input type="date" aria-label="시작일" value={startDate} onChange={(e) => handleStartChange(e.target.value)} />
        <span className="text-zinc-400">~</span>
        <Input
          type="date"
          aria-label="종료일"
          value={endDate}
          onChange={(e) => onEndChange(e.target.value)}
          disabled={!startDate}
          min={startDate || undefined}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

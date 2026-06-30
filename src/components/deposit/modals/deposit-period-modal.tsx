'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DepositPeriodFields } from '../deposit-period-fields';
import { validatePeriod } from '@/lib/deposit/period';
import { useUpdateDepositPeriod } from '@/hooks/use-deposit-mutations';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accountId: string;
  contractId: string;
  initialStart: string | null;
  initialEnd: string | null;
}

export function DepositPeriodModal({ open, onOpenChange, accountId, contractId, initialStart, initialEnd }: Props) {
  const [start, setStart] = useState(initialStart ?? '');
  const [end, setEnd] = useState(initialEnd ?? '');
  const [error, setError] = useState<string | null>(null);
  const update = useUpdateDepositPeriod();

  useEffect(() => {
    if (open) {
      setStart(initialStart ?? '');
      setEnd(initialEnd ?? '');
      setError(null);
    }
  }, [open, initialStart, initialEnd]);

  async function save() {
    const s = start || null;
    const e = end || null;
    const err = validatePeriod(s, e);
    if (err) {
      setError(err);
      return;
    }
    try {
      await update.mutateAsync({
        accountId,
        contractId,
        start_date: s,
        end_date: e,
        oldStart: initialStart,
        oldEnd: initialEnd,
      });
      onOpenChange(false);
    } catch (e2) {
      setError((e2 as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>계약 기간 수정</DialogTitle>
          <DialogDescription>예치금 계약의 시작일과 종료일을 설정합니다.</DialogDescription>
        </DialogHeader>
        <DepositPeriodFields
          startDate={start}
          endDate={end}
          onStartChange={setStart}
          onEndChange={setEnd}
          error={error}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={save} disabled={update.isPending}>
            {update.isPending ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

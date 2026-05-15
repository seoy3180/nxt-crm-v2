'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useVoidDepositTransaction } from '@/hooks/use-deposit-mutations';

export function DepositVoidModal({
  open,
  onOpenChange,
  txnId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  txnId: string;
}) {
  const [reason, setReason] = useState('');
  const mutation = useVoidDepositTransaction();
  const error = reason.length > 0 && reason.length < 5 ? '사유는 5자 이상 입력하세요' : null;

  async function handleConfirm() {
    if (reason.length < 5) return;
    await mutation.mutateAsync({ id: txnId, reason });
    onOpenChange(false);
    setReason('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>트랜잭션 무효화</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-600">
          이 트랜잭션을 무효화합니다. 사유를 입력하세요 (5자 이상).
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="void-reason">사유</Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            rows={3}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={reason.length < 5 || mutation.isPending}>
            {mutation.isPending ? '처리 중...' : '확인'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

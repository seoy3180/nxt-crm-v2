'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useActivateDeposit } from '@/hooks/use-deposit-mutations';

export function DepositActivateModal({
  open,
  onOpenChange,
  contractId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contractId: string;
  onSuccess?: () => void;
}) {
  const activate = useActivateDeposit();
  async function confirm() {
    await activate.mutateAsync(contractId);
    onSuccess?.();
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>예치금 계좌 활성화</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-600 leading-relaxed">
          이 계약에 예치금 추적을 시작합니다. 활성화 후 트랜잭션이 1건이라도 등록되면 계좌 비활성화가 제한됩니다.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={confirm} disabled={activate.isPending}>
            {activate.isPending ? '활성화 중...' : '활성화'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

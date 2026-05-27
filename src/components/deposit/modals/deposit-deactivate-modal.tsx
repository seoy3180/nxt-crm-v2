'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDeactivateDeposit } from '@/hooks/use-deposit-mutations';

export function DepositDeactivateModal({
  open,
  onOpenChange,
  accountId,
  balanceNotZero,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  accountId: string;
  balanceNotZero: boolean;
}) {
  const deactivate = useDeactivateDeposit();
  async function confirm() {
    await deactivate.mutateAsync(accountId);
    onOpenChange(false);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>예치금 계좌 비활성화</DialogTitle>
        </DialogHeader>
        {balanceNotZero ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            잔액이 0이 아닌 계좌는 비활성화할 수 없습니다. 환불·보정으로 잔액을 0으로 만든 뒤 비활성화하세요.
          </div>
        ) : (
          <p className="text-sm text-zinc-600 leading-relaxed">
            이 계좌를 비활성화합니다. 향후 재활성화 가능하며, 트랜잭션 이력은 보존됩니다.
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          {!balanceNotZero && (
            <Button onClick={confirm} disabled={deactivate.isPending}>
              {deactivate.isPending ? '처리 중...' : '비활성화'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

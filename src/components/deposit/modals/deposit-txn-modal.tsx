'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAddDepositTransaction } from '@/hooks/use-deposit-mutations';
import { useMoneyInput } from '@/components/common/money-input';
import type { DepositTxnType } from '@/lib/deposit/types';

const LABELS: Record<
  DepositTxnType,
  { title: string; amountLabel: string; memoRequired: boolean }
> = {
  deposit: { title: '예치 등록', amountLabel: '예치액', memoRequired: false },
  usage: { title: '사용 차감', amountLabel: '차감액', memoRequired: false },
  adjustment: { title: '잔액 보정', amountLabel: '보정 금액', memoRequired: true },
  refund: { title: '환불 등록', amountLabel: '환불액', memoRequired: true },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  txnType: DepositTxnType;
  currency: 'USD' | 'KRW';
  currentBalance: number;
}

/**
 * 거래 등록 통합 모달 (deposit/usage/adjustment/refund).
 * - deposit/usage/refund: amount > 0 강제
 * - adjustment: amount != 0 (음수 허용, 옵션 E)
 * - usage/refund: 차감 후 잔액 음수면 2차 확인 (BIZ-1)
 */
export function DepositTxnModal({
  open,
  onOpenChange,
  accountId,
  txnType,
  currency,
  currentBalance,
}: Props) {
  const label = LABELS[txnType];
  const isAdjustment = txnType === 'adjustment';
  const isDeduct = txnType === 'usage' || txnType === 'refund';

  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const amountInput = useMoneyInput(amount, setAmount, { allowNegative: isAdjustment });
  const [memo, setMemo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showNegativeConfirm, setShowNegativeConfirm] = useState(false);

  const mutation = useAddDepositTransaction();

  function validate(value: number): string | null {
    if (Number.isNaN(value)) return '숫자만 입력하세요';
    if (isAdjustment) {
      if (value === 0) return '보정 금액은 0이 될 수 없습니다';
    } else {
      if (value <= 0) return '금액은 1 이상이어야 합니다';
    }
    if (Math.abs(value) > 9_999_999_999) return '금액이 너무 큽니다 (최대 99억)';
    if (label.memoRequired && memo.trim().length < 5) return '사유를 5자 이상 입력하세요';
    if (memo.length > 200) return '메모는 200자 이내로 작성하세요';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    const err = validate(value);
    if (err) {
      setError(err);
      return;
    }
    // 음수 잔액 2차 확인 (usage/refund만)
    if (isDeduct && currentBalance - Math.abs(value) < 0 && !showNegativeConfirm) {
      setShowNegativeConfirm(true);
      return;
    }
    try {
      await mutation.mutateAsync({
        account_id: accountId,
        txn_date: txnDate,
        txn_type: txnType,
        amount: isAdjustment ? value : Math.abs(value),
        memo: memo.trim() || undefined,
      });
      onOpenChange(false);
      setAmount('');
      setMemo('');
      setError(null);
      setShowNegativeConfirm(false);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label.title}</DialogTitle>
          <DialogDescription>{currency} 통화 계좌</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="txn-date">일자</Label>
            <Input
              id="txn-date"
              type="date"
              value={txnDate}
              onChange={(e) => setTxnDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txn-amount">
              {label.amountLabel} ({currency})
            </Label>
            <Input
              id="txn-amount"
              type="text"
              {...amountInput}
              placeholder={isAdjustment ? '+ 또는 -' : '양수만'}
              inputMode="numeric"
            />
            <p className="text-[11px] text-zinc-400">
              {isAdjustment ? '보정은 양수/음수 모두 가능' : '양의 정수만 입력'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="txn-memo">
              메모{label.memoRequired ? ' (필수, 5자 이상)' : ' (선택)'}
            </Label>
            <Textarea
              id="txn-memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder={txnType === 'usage' ? 'AWS YYYY-MM 사용분' : undefined}
            />
            <p className="text-[11px] text-zinc-400">{memo.length}/200</p>
          </div>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {showNegativeConfirm && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              ⚠ 차감 후 잔액이 음수가 됩니다. 다시 한 번 등록을 클릭하면 진행됩니다.
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

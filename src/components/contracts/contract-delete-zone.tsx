'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDeleteContract } from '@/hooks/use-contract-mutations';
import { useSectionBasePath } from '@/hooks/use-section-base-path';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ContractDeleteZoneProps {
  contractId: string;
  contractName: string;
  isSettled: boolean;
  /** true면 헤더 인라인 버튼으로 표시 */
  inline?: boolean;
}

export function ContractDeleteZone({ contractId, contractName, isSettled, inline }: ContractDeleteZoneProps) {
  const router = useRouter();
  const basePath = useSectionBasePath();
  const deleteContract = useDeleteContract();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  async function handleDelete() {
    await deleteContract.mutateAsync(contractId);
    setConfirmOpen(false);
    router.push(`${basePath}/contracts`);
  }

  function openDialog() {
    setDeleteInput('');
    setConfirmOpen(true);
  }

  const triggerButton = inline ? (
    <button
      type="button"
      onClick={openDialog}
      disabled={isSettled}
      className="flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-4 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Trash2 className="h-3.5 w-3.5" />
      삭제
    </button>
  ) : (
    <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-red-500">계약 삭제</p>
        <p className="text-xs text-zinc-400">
          {isSettled
            ? '정산 완료된 계약은 삭제할 수 없습니다.'
            : '이 계약과 관련된 모든 데이터가 삭제됩니다.'}
        </p>
      </div>
      <button
        type="button"
        onClick={openDialog}
        disabled={isSettled}
        className="flex h-[34px] items-center gap-1.5 rounded-lg border border-red-300 px-3.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
        삭제
      </button>
    </div>
  );

  return (
    <>
      {triggerButton}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              계약 삭제
            </DialogTitle>
            <DialogDescription asChild className="pt-2">
              <div className="space-y-1 text-sm text-zinc-500">
                <p><strong className="text-zinc-900">{contractName}</strong>을(를) 삭제하시겠습니까?</p>
                <p>이 작업으로 아래 데이터가 삭제됩니다.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <ul className="space-y-0.5 text-[13px] text-red-600">
              <li>• MSP 상세 정보 삭제</li>
              <li>• 매출 배분 삭제</li>
              <li>• 변경 이력 삭제</li>
            </ul>
          </div>
          <div className="space-y-2 pt-2">
            <p className="text-sm text-zinc-500">
              확인을 위해 <strong className="text-red-600">&quot;삭제&quot;</strong>를 입력해주세요.
            </p>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              className="border-red-200 focus-visible:ring-red-400"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteInput !== '삭제' || deleteContract.isPending}
              onClick={handleDelete}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deleteContract.isPending ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

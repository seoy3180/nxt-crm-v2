'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useDeleteContract } from '@/hooks/use-contract-mutations';
import { Trash2 } from 'lucide-react';

interface ContractDeleteZoneProps {
  contractId: string;
  contractName: string;
  isSettled: boolean;
}

export function ContractDeleteZone({ contractId, contractName, isSettled }: ContractDeleteZoneProps) {
  const router = useRouter();
  const deleteContract = useDeleteContract();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    await deleteContract.mutateAsync(contractId);
    setConfirmOpen(false);
    router.push('/contracts');
  }

  return (
    <>
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
          onClick={() => setConfirmOpen(true)}
          disabled={isSettled}
          className="flex h-[34px] items-center gap-1.5 rounded-lg border border-red-300 px-3.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          삭제
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="계약 삭제"
        description={`"${contractName}" 계약을 정말 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteContract.isPending}
      />
    </>
  );
}

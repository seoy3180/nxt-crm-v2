'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useDeleteClient } from '@/hooks/use-client-mutations';
import { Trash2 } from 'lucide-react';

interface ClientDeleteZoneProps {
  clientId: string;
  clientName: string;
}

export function ClientDeleteZone({ clientId, clientName }: ClientDeleteZoneProps) {
  const router = useRouter();
  const deleteClient = useDeleteClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    await deleteClient.mutateAsync(clientId);
    setConfirmOpen(false);
    router.push('/clients');
  }

  return (
    <>
      <div className="flex items-center justify-between border-t border-zinc-100 pt-4">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-red-500">고객 삭제</p>
          <p className="text-xs text-zinc-400">이 고객과 관련된 모든 데이터가 삭제됩니다.</p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex h-[34px] items-center gap-1.5 rounded-lg border border-red-300 px-3.5 text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          삭제
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="고객 삭제"
        description={`"${clientName}" 고객을 정말 삭제하시겠습니까? 관련 연락처도 함께 삭제됩니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteClient.isPending}
      />
    </>
  );
}

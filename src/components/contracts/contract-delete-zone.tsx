'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
      <Card className="border-destructive/30">
        <CardHeader><CardTitle className="text-lg text-destructive">계약 삭제</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">이 계약을 삭제하면 관련 매출 배분도 함께 삭제됩니다.</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} disabled={isSettled}>
                    <Trash2 className="mr-1 h-3 w-3" />삭제
                  </Button>
                </span>
              </TooltipTrigger>
              {isSettled && (
                <TooltipContent>정산 완료된 계약은 삭제할 수 없습니다. 관리자에게 문의하세요.</TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

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

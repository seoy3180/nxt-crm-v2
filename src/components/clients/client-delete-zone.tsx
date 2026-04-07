'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">고객 삭제</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            이 고객을 삭제하면 관련 연락처도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="mr-1 h-3 w-3" />
            삭제
          </Button>
        </CardContent>
      </Card>

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

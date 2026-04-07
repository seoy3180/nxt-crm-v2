'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import { useChangeStage } from '@/hooks/use-contract-mutations';
import { useCurrentUser } from '@/hooks/use-current-user';

interface StageChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  contractType: string;
  currentStage: string | null;
}

export function StageChangeDialog({ open, onOpenChange, contractId, contractType, currentStage }: StageChangeDialogProps) {
  const [toStage, setToStage] = useState('');
  const [note, setNote] = useState('');
  const changeStage = useChangeStage(contractId);
  const { data: currentUser } = useCurrentUser();
  const stages = contractType === 'msp' ? MSP_STAGES : EDU_STAGES;

  async function handleSubmit() {
    if (!toStage || !currentUser) return;
    await changeStage.mutateAsync({ input: { toStage, note: note || null }, userId: currentUser.id });
    onOpenChange(false);
    setToStage('');
    setNote('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>단계 변경</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>변경할 단계</Label>
            <Select value={toStage} onValueChange={setToStage}>
              <SelectTrigger><SelectValue placeholder="단계 선택" /></SelectTrigger>
              <SelectContent>
                {stages.filter((s) => s.value !== currentStage).map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>메모 (선택)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="변경 사유" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={!toStage || changeStage.isPending}>
            {changeStage.isPending ? '변경 중...' : '변경'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

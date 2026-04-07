'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { MSP_STAGES, EDU_STAGES, BUSINESS_TYPES } from '@/lib/constants';
import { contractUpdateSchema } from '@/lib/validators/contract';
import { useUpdateContract } from '@/hooks/use-contract-mutations';
import type { ContractRow } from '@/lib/services/contract-service';
import { toast } from 'sonner';

interface ContractInfoCardProps {
  contract: ContractRow;
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '미지정';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function ContractInfoCard({ contract }: ContractInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const updateContract = useUpdateContract(contract.id);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get('name') as string,
      totalAmount: Number(formData.get('totalAmount') || 0),
      description: formData.get('description') as string || null,
    };
    const result = contractUpdateSchema.safeParse(raw);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? '입력을 확인해주세요');
      return;
    }
    await updateContract.mutateAsync(result.data);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">계약 정보</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>취소</Button>
              <Button type="submit" size="sm" disabled={updateContract.isPending}>저장</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>계약명</Label>
                <Input name="name" defaultValue={contract.name} />
              </div>
              <div className="space-y-2">
                <Label>금액 (원)</Label>
                <Input name="totalAmount" type="number" defaultValue={contract.total_amount} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea name="description" defaultValue={contract.description ?? ''} rows={2} />
            </div>
          </CardContent>
        </Card>
      </form>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">계약 정보</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-1 h-3 w-3" />수정
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">계약 ID</p>
            <p className="text-sm font-medium">{contract.contract_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">비즈니스 타입</p>
            <Badge variant="outline">{BUSINESS_TYPES[contract.type as keyof typeof BUSINESS_TYPES] ?? contract.type}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">계약명</p>
            <p className="text-sm font-medium">{contract.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">고객</p>
            <p className="text-sm font-medium">{contract.client_name ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">단계</p>
            <Badge variant="secondary">{getStageLabel(contract.stage, contract.type)}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">금액</p>
            <p className="text-sm font-medium">{formatAmount(contract.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">담당자</p>
            <p className="text-sm font-medium">{contract.assigned_to_name ?? '-'}</p>
          </div>
        </div>
        {contract.description && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">설명</p>
            <p className="text-sm">{contract.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

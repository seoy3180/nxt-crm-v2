'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BUSINESS_TYPES } from '@/lib/constants';
import { contractCreateSchema, mspDetailSchema, type EduOperationInput } from '@/lib/validators/contract';
import { useCreateContract } from '@/hooks/use-contract-mutations';
import { useClients, useProfiles } from '@/hooks/use-clients';
import { MspFields } from './msp-fields';
import { EduFields } from './edu-fields';
import { toast } from 'sonner';

export function ContractForm() {
  const router = useRouter();
  const createContract = useCreateContract();
  const { data: clientsData } = useClients({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' });
  const { data: profiles } = useProfiles();
  const [contractType, setContractType] = useState<string>('msp');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [operations, setOperations] = useState<EduOperationInput[]>([
    { operationName: '1차', location: null, targetOrg: null, startDate: null, endDate: null, totalHours: null, contractedCount: null, recruitedCount: null, actualCount: null, providesLunch: false, providesSnack: false },
  ]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get('name') as string,
      clientId: formData.get('clientId') as string,
      type: contractType,
      totalAmount: Number(formData.get('totalAmount') || 0),
      currency: 'KRW',
      description: formData.get('description') as string || null,
      assignedTo: formData.get('assignedTo') as string || null,
    };

    const result = contractCreateSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const contract = await createContract.mutateAsync(result.data);

      if (contractType === 'msp') {
        const mspRaw = {
          billingLevel: formData.get('billingLevel') as string || null,
          creditShare: formData.get('creditShare') ? Number(formData.get('creditShare')) : null,
          expectedMrr: formData.get('expectedMrr') ? Number(formData.get('expectedMrr')) : null,
          payer: formData.get('payer') as string || null,
          salesRep: formData.get('salesRep') as string || null,
          awsAmount: formData.get('awsAmount') ? Number(formData.get('awsAmount')) : null,
          hasManagementFee: formData.get('hasManagementFee') === 'true',
        };
        const mspResult = mspDetailSchema.safeParse(mspRaw);
        if (mspResult.success) {
          const { contractService } = await import('@/lib/services/contract-service');
          await contractService.updateMspDetails(contract.id, mspResult.data);
        }
      }

      if (contractType === 'tt' && operations.length > 0) {
        const { educationOpService } = await import('@/lib/services/contract-service');
        for (const op of operations) {
          if (op.operationName) {
            await educationOpService.create(contract.id, op);
          }
        }
      }

      router.push(`/contracts/${contract.id}`);
    } catch {
      toast.error('계약 등록에 실패했습니다');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-[640px] space-y-6">
      {/* 비즈니스 유형 선택 */}
      <div className="space-y-2">
        <Label className="text-[13px]">비즈니스 유형</Label>
        <div className="flex gap-2">
          {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setContractType(key)}
              className={`h-9 rounded-lg px-4 text-[13px] font-medium transition-colors ${
                contractType === key
                  ? 'bg-blue-600 text-white'
                  : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-zinc-200" />

      {/* 기본 정보 */}
      <h3 className="text-base font-semibold text-zinc-900">기본 정보</h3>

      <div className="space-y-1.5">
        <Label>계약명 *</Label>
        <Input name="name" placeholder="계약명을 입력하세요" autoFocus />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>고객 *</Label>
        <Select name="clientId">
          <SelectTrigger><SelectValue placeholder="고객 선택" /></SelectTrigger>
          <SelectContent>
            {clientsData?.data?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.clientId && <p className="text-sm text-red-500">{errors.clientId}</p>}
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label>총 금액 (원)</Label>
          <Input name="totalAmount" type="number" placeholder="0" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>사내 담당자</Label>
          <Select name="assignedTo">
            <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
            <SelectContent>
              {profiles?.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* MSP 확장 */}
      {contractType === 'msp' && (
        <>
          <div className="h-px bg-zinc-200" />
          <h3 className="text-base font-semibold text-zinc-900">MSP 정보</h3>
          <MspFields />
        </>
      )}

      {/* 교육 확장 */}
      {contractType === 'tt' && (
        <>
          <div className="h-px bg-zinc-200" />
          <EduFields operations={operations} onOperationsChange={setOperations} />
        </>
      )}

      <div className="space-y-1.5">
        <Label>설명</Label>
        <Textarea name="description" placeholder="계약 설명" rows={2} />
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        <Button
          type="submit"
          disabled={createContract.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {createContract.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  );
}

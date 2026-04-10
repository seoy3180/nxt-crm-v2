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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { contractCreateSchema, mspDetailSchema, type EduOperationInput } from '@/lib/validators/contract';
import { safeNumber } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { useCreateContract } from '@/hooks/use-contract-mutations';
import { useClients } from '@/hooks/use-clients';
import { useEmployees } from '@/hooks/use-employees';
import { useContacts, useCreateContact } from '@/hooks/use-contacts';
import { ContactFormDialog } from '@/components/clients/contact-form-dialog';
import { ClientFormDialog } from '@/components/clients/client-form-dialog';
import { MspFields } from './msp-fields';
import { EduFields } from './edu-fields';
import { toast } from 'sonner';
import type { ContactCreateInput } from '@/lib/validators/client';

interface ContractFormProps {
  defaultType?: string;
  hideTypeSelector?: boolean;
  /** 등록 후 이동할 기본 경로 (예: '/msp/contracts'). 기본값: '/contracts' */
  basePath?: string;
}

export function ContractForm({ defaultType = 'msp', hideTypeSelector, basePath = '/contracts' }: ContractFormProps) {
  const router = useRouter();
  const createContract = useCreateContract();
  const { data: clientsData } = useClients({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' });
  const allClients = clientsData?.data ?? [];
  const { data: employees } = useEmployees();
  const [contractType, setContractType] = useState<string>(defaultType);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const { data: contacts } = useContacts(selectedClientId);
  const createContact = useCreateContact(selectedClientId);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [operations, setOperations] = useState<EduOperationInput[]>([
    { operationName: '1차', location: null, targetOrg: null, dates: [{ date: '', hours: 0 }], contractedCount: null, recruitedCount: null, actualCount: null, providesLunch: false, providesSnack: false },
  ]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get('name') as string,
      clientId: formData.get('clientId') as string,
      type: contractType,
      totalAmount: safeNumber(formData.get('totalAmount')) ?? 0,
      currency: 'KRW',
      description: formData.get('description') as string || null,
      assignedTo: formData.get('assignedTo') as string || null,
      contactId: formData.get('contactId') as string || null,
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
          creditShare: formData.get('creditShare') as string || null,
          expectedMrr: safeNumber(formData.get('expectedMrr')),
          payer: formData.get('payer') as string || null,
          salesRepId: formData.get('salesRepId') as string || null,
          awsAmount: safeNumber(formData.get('awsAmount')),
          hasManagementFee: formData.get('hasManagementFee') === 'true',
          billingMethod: formData.get('billingMethod') as string || null,
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

      toast.success('계약이 등록되었습니다');
      router.push(`${basePath}/${contract.id}`);
    } catch (err) {
      const { getErrorMessage } = await import('@/lib/utils');
      toast.error(`계약 등록 실패: ${getErrorMessage(err)}`);
    }
  }

  async function handleCreateContact(data: ContactCreateInput) {
    try {
      const created = await createContact.mutateAsync(data);
      if (created?.id) {
        setSelectedContactId(created.id);
      }
    } catch {
      // onError 토스트가 이미 처리
    }
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="w-[640px] space-y-6">
      {/* 비즈니스 유형 선택 */}
      {!hideTypeSelector && <div className="space-y-2">
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
      </div>}

      {!hideTypeSelector && <div className="h-px bg-zinc-200" />}

      {/* 기본 정보 */}
      <h3 className="text-base font-semibold text-zinc-900">기본 정보</h3>

      <div className="space-y-1.5">
        <Label>계약명 *</Label>
        <Input name="name" placeholder="계약명을 입력하세요" autoFocus />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>고객 *</Label>
        <input type="hidden" name="clientId" value={selectedClientId} />
        <div className="flex gap-2">
          <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
            <PopoverTrigger
              className="flex h-10 flex-1 items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm transition-colors hover:bg-zinc-50"
            >
              <span className={selectedClientId ? 'text-zinc-900' : 'text-zinc-400'}>
                {selectedClientId
                  ? allClients.find((c) => c.id === selectedClientId)?.name ?? selectedClientName ?? '선택됨'
                  : '고객 검색...'}
              </span>
              <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
            </PopoverTrigger>
            <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
              <Command>
                <CommandInput placeholder="고객명 검색..." />
                <CommandList>
                  <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                  <CommandGroup>
                    {allClients.map((c) => (
                      <CommandItem
                        key={c.id}
                        value={c.name}
                        onSelect={() => { setSelectedClientId(c.id); setSelectedClientName(c.name); setSelectedContactId(''); setClientPopoverOpen(false); }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', selectedClientId === c.id ? 'opacity-100' : 'opacity-0')} />
                        {c.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={() => setClientDialogOpen(true)}
            title="새 고객 추가"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {errors.clientId && <p className="text-sm text-red-500">{errors.clientId}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>고객사 담당자</Label>
        <div className="flex gap-2">
          <Select name="contactId" value={selectedContactId} onValueChange={setSelectedContactId} disabled={!selectedClientId}>
            <SelectTrigger className="flex-1"><SelectValue placeholder={selectedClientId ? '담당자 선택' : '고객을 먼저 선택하세요'} /></SelectTrigger>
            <SelectContent>
              {contacts?.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}{c.position ? ` (${c.position})` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0"
            disabled={!selectedClientId}
            onClick={() => setContactDialogOpen(true)}
            title="새 연락처 추가"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label>총 금액 (원)</Label>
          <Input name="totalAmount" inputMode="numeric" placeholder="0" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>사내 담당자</Label>
          <Select name="assignedTo">
            <SelectTrigger><SelectValue placeholder="담당자 선택" /></SelectTrigger>
            <SelectContent>
              {employees?.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>설명</Label>
        <Textarea name="description" placeholder="계약 설명" rows={2} />
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

    <ContactFormDialog
      open={contactDialogOpen}
      onOpenChange={setContactDialogOpen}
      onSubmit={handleCreateContact}
      loading={createContact.isPending}
    />

    <ClientFormDialog
      open={clientDialogOpen}
      onOpenChange={setClientDialogOpen}
      onCreated={(client) => {
        setSelectedClientId(client.id);
        setSelectedClientName(client.name);
        setSelectedContactId('');
      }}
    />
    </>
  );
}

'use client';

import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees } from '@/hooks/use-employees';
import type { ContractRow } from '@/lib/services/contract-service';

function formatFullAmount(amount: number) {
  return `₩ ${new Intl.NumberFormat('ko-KR').format(amount)}`;
}

interface ContractInfoCardProps {
  contract: ContractRow;
  editing?: boolean;
  editValues?: Record<string, string>;
  onFieldChange?: (field: string, value: string) => void;
}

export function ContractInfoCard({ contract, editing, editValues, onFieldChange }: ContractInfoCardProps) {
  const { data: employees } = useEmployees();

  const val = (field: string, fallback: string) => editing ? (editValues?.[field] ?? fallback) : fallback;

  return (
    <div className="rounded-xl border border-zinc-200 p-6 space-y-5">
      <h3 className="text-lg font-semibold text-zinc-900">계약 정보</h3>

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">총 금액</p>
          {editing ? (
            <Input
              value={val('totalAmount', String(contract.total_amount))}
              onChange={(e) => onFieldChange?.('totalAmount', e.target.value)}
              inputMode="numeric"
              className="h-9 text-base"
            />
          ) : (
            <p className="text-base font-semibold text-zinc-900">{formatFullAmount(contract.total_amount)}</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">통화</p>
          <p className="text-base font-medium text-zinc-900">{contract.currency ?? 'KRW'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">고객</p>
          {contract.client_id ? (
            <Link href={`/clients/${contract.client_id}`} className="text-base font-medium text-blue-600 hover:underline">
              {contract.client_name ?? '-'}
            </Link>
          ) : (
            <p className="text-base font-medium text-zinc-900">-</p>
          )}
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">사내 담당자</p>
          {editing ? (
            <Select
              value={val('assignedTo', contract.assigned_to ?? '')}
              onValueChange={(v) => onFieldChange?.('assignedTo', v)}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-base font-medium text-zinc-900">{contract.assigned_to_name ?? '-'}</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">고객사 담당자</p>
          <p className="text-base font-medium text-zinc-900">{contract.contact_name ?? '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">메모</p>
          {editing ? (
            <Input
              value={val('memo', contract.memo ?? '')}
              onChange={(e) => onFieldChange?.('memo', e.target.value)}
              className="h-9 text-base"
            />
          ) : (
            <p className="text-base font-medium text-zinc-900">{contract.memo || '-'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees } from '@/hooks/use-employees';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSectionBasePath } from '@/hooks/use-section-base-path';
import { contractService, type ContractRow } from '@/lib/services/contract-service';
import { CONTRACT_FIELDS_BY_KEY, type FieldChangeContext } from '@/lib/contracts/field-definitions';
import { getErrorMessage } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

function formatFullAmount(amount: number) {
  return `₩ ${new Intl.NumberFormat('ko-KR').format(amount)}`;
}

interface ContractInfoCardProps {
  contract: ContractRow;
}

export function ContractInfoCard({ contract }: ContractInfoCardProps) {
  const queryClient = useQueryClient();
  const { data: employees } = useEmployees();
  const { data: currentUser } = useCurrentUser();
  const basePath = useSectionBasePath();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const val = (field: string, fallback: string) => editing ? (editValues[field] ?? fallback) : fallback;
  const handleFieldChange = (field: string, value: string) => setEditValues((prev) => ({ ...prev, [field]: value }));

  function handleCancel() {
    setEditValues({});
    setEditing(false);
  }

  async function handleSave() {
    if (Object.keys(editValues).length === 0) { setEditing(false); return; }
    setSaving(true);
    try {
      const contractUpdate: Record<string, unknown> = {};
      for (const [key, raw] of Object.entries(editValues)) {
        const def = CONTRACT_FIELDS_BY_KEY.get(key);
        if (!def || def.target !== 'contract') continue;
        contractUpdate[def.serviceKey] = def.parse(raw);
      }
      if (Object.keys(contractUpdate).length > 0) {
        await contractService.update(contract.id, contractUpdate as Parameters<typeof contractService.update>[1]);
      }
      // 변경이력
      if (currentUser) {
        const ctx: FieldChangeContext = { employees, contract };
        const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
        for (const [key, newRaw] of Object.entries(editValues)) {
          const def = CONTRACT_FIELDS_BY_KEY.get(key);
          if (!def || def.target !== 'contract') continue;
          const oldRaw = def.getOriginal(contract);
          if (String(oldRaw ?? '') === String((newRaw || null) ?? '')) continue;
          changes.push({
            field: def.label,
            oldValue: def.formatDisplay ? def.formatDisplay(oldRaw, ctx) : oldRaw,
            newValue: def.formatDisplay ? def.formatDisplay(newRaw || null, ctx) : newRaw || null,
          });
        }
        if (changes.length > 0) await contractService.logChanges(contract.id, currentUser.id, changes).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['contract-history', contract.id] });
      toast.success('계약 정보가 저장되었습니다');
      setEditValues({});
      setEditing(false);
    } catch (err) {
      toast.error(`저장 실패: ${getErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">계약 정보</h3>
        {editing ? (
          <div className="flex gap-1.5">
            <button type="button" onClick={handleCancel} className="h-[30px] rounded-md border border-zinc-200 px-3 text-[12px] text-zinc-500 hover:bg-zinc-50">취소</button>
            <button type="button" onClick={handleSave} disabled={saving} className="h-[30px] rounded-md bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? '저장 중...' : '저장'}</button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className="flex h-[30px] items-center gap-1 rounded-md border border-zinc-200 px-2.5 text-[12px] text-zinc-400 hover:bg-zinc-50">
            <Pencil className="h-3 w-3" /> 수정
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">총 금액</p>
          {editing ? (
            <Input
              value={val('totalAmount', String(contract.total_amount))}
              onChange={(e) => handleFieldChange('totalAmount', e.target.value)}
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
            <Link href={`${basePath}/clients/${contract.client_id}`} className="text-base font-medium text-blue-600 hover:underline">
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
              onValueChange={(v) => handleFieldChange('assignedTo', v)}
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
              onChange={(e) => handleFieldChange('memo', e.target.value)}
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

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees, useSalesReps } from '@/hooks/use-employees';
import { useCurrentUser } from '@/hooks/use-current-user';
import { CREDIT_SHARE_OPTIONS, CREDIT_SHARE_COLORS, PAYER_OPTIONS, BILLING_METHOD_OPTIONS, MSP_GRADES, AWS_AM_OPTIONS, AWS_AM_COLORS, MSP_TAG_OPTIONS } from '@/lib/constants';
import { contractService, type ContractRow, type MspDetailRow, type TechLeadRow } from '@/lib/services/contract-service';
import { CONTRACT_FIELDS_BY_KEY, type FieldChangeContext } from '@/lib/contracts/field-definitions';
import { getErrorMessage } from '@/lib/utils';
import {
  FieldCell,
  FieldText,
  FieldSelect,
  FieldChips,
  FieldMultiSelect,
} from '@/components/common/field-cell';

import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface MspDetailCardProps {
  contract: ContractRow;
  details: MspDetailRow | null;
  techLeads?: TechLeadRow[];
}

export function MspDetailCard({
  contract,
  details,
}: MspDetailCardProps) {
  const queryClient = useQueryClient();
  const { data: employees } = useEmployees();
  const { data: salesReps } = useSalesReps();
  const { data: currentUser } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  if (!details && !editing) return null;

  const val = (field: string, fallback: string) =>
    editing ? (editValues[field] ?? fallback) : fallback;

  const handleFieldChange = (field: string, value: string) => setEditValues((prev) => ({ ...prev, [field]: value }));
  const handle = (field: string) => (v: string) => handleFieldChange(field, v);

  function handleCancel() {
    setEditValues({});
    setEditing(false);
  }

  async function handleSave() {
    if (Object.keys(editValues).length === 0) { setEditing(false); return; }
    setSaving(true);
    try {
      const mspUpdate: Record<string, unknown> = {};
      let techLeadIds: string[] | undefined;
      for (const [key, raw] of Object.entries(editValues)) {
        const def = CONTRACT_FIELDS_BY_KEY.get(key);
        if (!def) continue;
        const parsed = def.parse(raw);
        if (def.target === 'msp_details') mspUpdate[def.serviceKey] = parsed;
        else if (def.target === 'tech_leads') techLeadIds = parsed as string[];
      }
      if (Object.keys(mspUpdate).length > 0) {
        await contractService.updateMspDetails(contract.id, mspUpdate as Parameters<typeof contractService.updateMspDetails>[1]);
      }
      if (techLeadIds !== undefined) {
        await contractService.updateTechLeads(contract.id, techLeadIds);
      }
      // 변경이력
      if (currentUser) {
        const ctx: FieldChangeContext = { employees, contract };
        const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
        for (const [key, newRaw] of Object.entries(editValues)) {
          const def = CONTRACT_FIELDS_BY_KEY.get(key);
          if (!def || (def.target !== 'msp_details' && def.target !== 'tech_leads')) continue;
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
      toast.success('MSP 상세가 저장되었습니다');
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
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-zinc-900">MSP 상세</h3>
          <span className="inline-block rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
            MSP
          </span>
        </div>
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

      {/* 1행: 빌링온 별칭 / 태그 / 루트 계정 메일 */}
      <div className="grid grid-cols-3 gap-8">
        <FieldCell label="빌링온 별칭">
          <FieldText
            editing={editing}
            value={val('billingOnAlias', details?.billing_on_alias ?? '')}
            readValue={details?.billing_on_alias}
            onChange={handle('billingOnAlias')}
            placeholder="빌링온 계정 별칭"
          />
        </FieldCell>
        <FieldCell label="태그">
          <FieldMultiSelect
            editing={editing}
            value={val('tags', (details?.tags ?? []).join(', '))}
            readValues={details?.tags}
            options={MSP_TAG_OPTIONS}
            onChange={handle('tags')}
            placeholder="태그 선택"
          />
        </FieldCell>
        <FieldCell label="루트 계정 메일">
          <FieldText
            editing={editing}
            value={val('rootAccountEmail', details?.root_account_email ?? '')}
            readValue={details?.root_account_email}
            onChange={handle('rootAccountEmail')}
            placeholder="root@example.com"
          />
        </FieldCell>
      </div>

      <div className="h-px bg-zinc-100" />

      {/* 2행: Payer / MSP 등급 / 영업 담당 */}
      <div className="grid grid-cols-3 gap-8">
        <FieldCell label="Payer">
          <FieldSelect
            editing={editing}
            value={val('payer', details?.payer ?? '')}
            readValue={details?.payer}
            options={PAYER_OPTIONS}
            onChange={handle('payer')}
          />
        </FieldCell>
        <FieldCell label="MSP 등급">
          <FieldSelect
            editing={editing}
            value={val('mspGrade', details?.msp_grade ?? '')}
            readValue={details?.msp_grade}
            options={MSP_GRADES}
            onChange={handle('mspGrade')}
            readClassName="text-blue-600 font-semibold"
          />
        </FieldCell>
        <FieldCell label="영업 담당">
          <FieldSelect
            editing={editing}
            value={val('salesRepId', details?.sales_rep_id ?? '')}
            readValue={details?.sales_rep_name}
            options={(salesReps ?? []).map((e) => ({ value: e.id, label: e.name }))}
            onChange={handle('salesRepId')}
          />
        </FieldCell>
      </div>

      <div className="h-px bg-zinc-100" />

      {/* 3행: 크레딧 쉐어 / 청구 방식 / AWS AM */}
      <div className="grid grid-cols-3 gap-8">
        <FieldCell label="크레딧 쉐어">
          <FieldSelect
            editing={editing}
            value={val('creditShare', details?.credit_share ?? '')}
            readValue={details?.credit_share}
            options={CREDIT_SHARE_OPTIONS}
            onChange={handle('creditShare')}
            colors={CREDIT_SHARE_COLORS}
          />
        </FieldCell>
        <FieldCell label="청구 방식">
          <FieldSelect
            editing={editing}
            value={val('billingMethod', details?.billing_method ?? '')}
            readValue={details?.billing_method}
            options={BILLING_METHOD_OPTIONS}
            onChange={handle('billingMethod')}
          />
        </FieldCell>
        <FieldCell label="AWS AM">
          <FieldSelect
            editing={editing}
            value={val('awsAm', details?.aws_am ?? '')}
            readValue={details?.aws_am}
            options={AWS_AM_OPTIONS}
            onChange={handle('awsAm')}
            placeholder="선택"
            colors={AWS_AM_COLORS}
          />
        </FieldCell>
      </div>

      <div className="h-px bg-zinc-100" />

      {/* 4행: AWS 계정 ID */}
      <FieldCell label="AWS 계정 ID">
        <FieldChips
          editing={editing}
          value={val('awsAccountIds', (details?.aws_account_ids ?? []).join(', '))}
          readValues={details?.aws_account_ids}
          onChange={handle('awsAccountIds')}
          placeholder="Account ID 입력 후 Enter"
          chipClassName="bg-blue-50 text-blue-600"
          validate={(v) => {
            if (v.includes('-')) return undefined;
            if (!/^\d+$/.test(v)) return '숫자만 입력하거나 라벨 - ID 형태로 입력하세요';
            if (v.length !== 12) return 'AWS Account ID는 12자리입니다';
            return undefined;
          }}
        />
      </FieldCell>
    </div>
  );
}

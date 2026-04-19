'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '@/hooks/use-employees';
import { useCurrentUser } from '@/hooks/use-current-user';
import { CREDIT_SHARE_OPTIONS, PAYER_OPTIONS, BILLING_METHOD_OPTIONS, MSP_GRADES, AWS_AM_OPTIONS } from '@/lib/constants';
import { contractService, type ContractRow, type MspDetailRow, type TechLeadRow } from '@/lib/services/contract-service';
import { CONTRACT_FIELDS_BY_KEY, type FieldChangeContext } from '@/lib/contracts/field-definitions';
import { getErrorMessage } from '@/lib/utils';
import { EmployeeMultiSelect } from '@/components/common/employee-multi-select';
import {
  FieldCell,
  FieldText,
  FieldNumber,
  FieldSelect,
  FieldChips,
  FieldMultiSelect,
  FieldReadText,
} from '@/components/common/field-cell';

const MSP_TAG_OPTIONS = ['디자인중시', '빠른결정', '가격민감', '기술중심'] as const;
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface MspDetailCardProps {
  contract: ContractRow;
  details: MspDetailRow | null;
  techLeads?: TechLeadRow[];
}

function formatMrr(amount: number) {
  if (amount >= 10000) {
    return `₩ ${Math.round(amount / 10000).toLocaleString()}만`;
  }
  return `₩ ${amount.toLocaleString()}`;
}

export function MspDetailCard({
  contract,
  details,
  techLeads,
}: MspDetailCardProps) {
  const queryClient = useQueryClient();
  const { data: employees } = useEmployees();
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

  // techLeadIds는 CSV 문자열로 editValues에 저장
  const initialTechLeadIds = (techLeads ?? []).map((t) => t.employee_id).join(',');
  const currentTechLeadIds = val('techLeadIds', initialTechLeadIds)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // billing_on은 bool → string 변환
  const billingOnValue = val('billingOn', details?.billing_on ? 'true' : 'false');

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

      {/* 1행: MSP 등급 / 크레딧 쉐어 / 예상 MRR */}
      <div className="grid grid-cols-3 gap-8">
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
        <FieldCell label="크레딧 쉐어">
          <FieldSelect
            editing={editing}
            value={val('creditShare', details?.credit_share ?? '')}
            readValue={details?.credit_share}
            options={CREDIT_SHARE_OPTIONS}
            onChange={handle('creditShare')}
          />
        </FieldCell>
        <FieldCell label="예상 MRR">
          <FieldNumber
            editing={editing}
            value={val('expectedMrr', String(details?.expected_mrr ?? ''))}
            readValue={details?.expected_mrr}
            format={formatMrr}
            onChange={handle('expectedMrr')}
          />
        </FieldCell>
      </div>

      <div className="h-px bg-zinc-100" />

      {/* 2행: Payer / 청구 방식 / 영업 담당 */}
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
        <FieldCell label="청구 방식">
          <FieldSelect
            editing={editing}
            value={val('billingMethod', details?.billing_method ?? '')}
            readValue={details?.billing_method}
            options={BILLING_METHOD_OPTIONS}
            onChange={handle('billingMethod')}
          />
        </FieldCell>
        <FieldCell label="영업 담당">
          <FieldSelect
            editing={editing}
            value={val('salesRepId', details?.sales_rep_id ?? '')}
            readValue={details?.sales_rep_name}
            options={(employees ?? []).map((e) => ({ value: e.id, label: e.name }))}
            onChange={handle('salesRepId')}
          />
        </FieldCell>
      </div>

      <div className="h-px bg-zinc-100" />

      {/* 3행: AWS 금액 / AWS AM / 빌링온 */}
      <div className="grid grid-cols-3 gap-8">
        <FieldCell label="AWS 금액">
          <FieldNumber
            editing={editing}
            value={val('awsAmount', String(details?.aws_amount ?? ''))}
            readValue={details?.aws_amount}
            format={formatMrr}
            onChange={handle('awsAmount')}
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
          />
        </FieldCell>
        <FieldCell label="빌링온">
          {editing ? (
            <div className="flex h-9 rounded-md bg-zinc-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => handleFieldChange('billingOn', 'true')}
                className={`flex-1 rounded text-[12px] font-medium transition-colors ${
                  billingOnValue === 'true'
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                    : 'text-zinc-400'
                }`}
              >
                등록
              </button>
              <button
                type="button"
                onClick={() => handleFieldChange('billingOn', 'false')}
                className={`flex-1 rounded text-[12px] font-medium transition-colors ${
                  billingOnValue === 'false'
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                    : 'text-zinc-400'
                }`}
              >
                미등록
              </button>
            </div>
          ) : (
            <span
              className={`inline-block rounded px-2.5 py-0.5 text-[13px] font-semibold ${
                details?.billing_on
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {details?.billing_on ? '등록' : '미등록'}
            </span>
          )}
        </FieldCell>
      </div>

      <FieldCell label="빌링온 별칭">
        <FieldText
          editing={editing}
          value={val('billingOnAlias', details?.billing_on_alias ?? '')}
          readValue={details?.billing_on_alias}
          onChange={handle('billingOnAlias')}
          placeholder="빌링온 계정 별칭"
        />
      </FieldCell>

      <FieldCell label="AWS 계정 ID">
        <FieldChips
          editing={editing}
          value={val('awsAccountIds', (details?.aws_account_ids ?? []).join(', '))}
          readValues={details?.aws_account_ids}
          onChange={handle('awsAccountIds')}
          placeholder="Account ID 입력 후 Enter"
          chipClassName="bg-blue-50 text-blue-600"
          validate={(v) => {
            if (!/^\d+$/.test(v)) return '숫자만 입력 가능합니다';
            if (v.length !== 12) return 'AWS Account ID는 12자리입니다';
            return undefined;
          }}
        />
      </FieldCell>

      <FieldCell label="담당 기술">
        {editing ? (
          <EmployeeMultiSelect
            selectedIds={currentTechLeadIds}
            onChange={(ids) => handleFieldChange('techLeadIds', ids.join(','))}
            placeholder="기술 담당자 선택"
            triggerClassName="h-9"
          />
        ) : techLeads && techLeads.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {techLeads.map((t) => (
              <span
                key={t.employee_id}
                className="rounded-md bg-zinc-100 px-2 py-0.5 text-[13px] font-medium text-zinc-700"
              >
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          <FieldReadText>{null}</FieldReadText>
        )}
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
    </div>
  );
}

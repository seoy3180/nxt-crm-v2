'use client';

import { useEmployees } from '@/hooks/use-employees';
import { CREDIT_SHARE_OPTIONS, PAYER_OPTIONS, BILLING_METHOD_OPTIONS, MSP_GRADES } from '@/lib/constants';
import type { MspDetailRow, TechLeadRow } from '@/lib/services/contract-service';
import { EmployeeMultiSelect } from '@/components/common/employee-multi-select';
import {
  FieldCell,
  FieldText,
  FieldNumber,
  FieldSelect,
  FieldChips,
  FieldReadText,
} from '@/components/common/field-cell';

interface MspDetailCardProps {
  details: MspDetailRow | null;
  techLeads?: TechLeadRow[];
  editing?: boolean;
  editValues?: Record<string, string>;
  onFieldChange?: (field: string, value: string) => void;
}

function formatMrr(amount: number) {
  if (amount >= 10000) {
    return `₩ ${Math.round(amount / 10000).toLocaleString()}만`;
  }
  return `₩ ${amount.toLocaleString()}`;
}

export function MspDetailCard({
  details,
  techLeads,
  editing = false,
  editValues,
  onFieldChange,
}: MspDetailCardProps) {
  const { data: employees } = useEmployees();

  if (!details && !editing) return null;

  const val = (field: string, fallback: string) =>
    editing ? (editValues?.[field] ?? fallback) : fallback;

  const handle = (field: string) => (v: string) => onFieldChange?.(field, v);

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
        <h3 className="text-lg font-semibold text-zinc-900">MSP 상세</h3>
        <span className="inline-block rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
          MSP
        </span>
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
          <FieldText
            editing={editing}
            value={val('awsAm', details?.aws_am ?? '')}
            readValue={details?.aws_am}
            onChange={handle('awsAm')}
            placeholder="AWS 담당자명"
          />
        </FieldCell>
        <FieldCell label="빌링온">
          {editing ? (
            <div className="flex h-9 rounded-md bg-zinc-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => onFieldChange?.('billingOn', 'true')}
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
                onClick={() => onFieldChange?.('billingOn', 'false')}
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
          placeholder="쉼표로 구분 (예: 123456789012, 987654321098)"
          chipClassName="bg-blue-50 text-blue-600"
        />
      </FieldCell>

      <FieldCell label="담당 기술">
        {editing ? (
          <EmployeeMultiSelect
            selectedIds={currentTechLeadIds}
            onChange={(ids) => onFieldChange?.('techLeadIds', ids.join(','))}
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
        <FieldChips
          editing={editing}
          value={val('tags', (details?.tags ?? []).join(', '))}
          readValues={details?.tags}
          onChange={handle('tags')}
          placeholder="쉼표로 구분 (예: 빠른결정, 기술중심)"
        />
      </FieldCell>
    </div>
  );
}

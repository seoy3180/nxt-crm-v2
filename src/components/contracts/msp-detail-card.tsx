'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees } from '@/hooks/use-employees';
import { CREDIT_SHARE_OPTIONS, PAYER_OPTIONS, BILLING_METHOD_OPTIONS, MSP_GRADES } from '@/lib/constants';
import type { MspDetailRow, TechLeadRow } from '@/lib/services/contract-service';
import { EmployeeMultiSelect } from '@/components/common/employee-multi-select';

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

export function MspDetailCard({ details, techLeads, editing, editValues, onFieldChange }: MspDetailCardProps) {
  const { data: employees } = useEmployees();

  if (!details && !editing) return null;

  const val = (field: string, fallback: string) => editing ? (editValues?.[field] ?? fallback) : fallback;

  // techLeadIds는 CSV 문자열로 editValues에 저장. 빈값이면 [], 아니면 split.
  const initialTechLeadIds = (techLeads ?? []).map((t) => t.employee_id).join(',');
  const currentTechLeadIds = val('techLeadIds', initialTechLeadIds)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="rounded-xl border border-zinc-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">MSP 상세</h3>
        <span className="inline-block rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600">MSP</span>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">MSP 등급</p>
          {editing ? (
            <Select
              value={val('mspGrade', details?.msp_grade ?? '')}
              onValueChange={(v) => onFieldChange?.('mspGrade', v)}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {MSP_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[15px] font-semibold text-blue-600">{details?.msp_grade ?? '-'}</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">크레딧 쉐어</p>
          {editing ? (
            <Select
              value={val('creditShare', details?.credit_share ?? '')}
              onValueChange={(v) => onFieldChange?.('creditShare', v)}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {CREDIT_SHARE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[15px] font-medium text-zinc-900">{details?.credit_share ?? '-'}</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">예상 MRR</p>
          {editing ? (
            <Input
              value={val('expectedMrr', String(details?.expected_mrr ?? ''))}
              onChange={(e) => onFieldChange?.('expectedMrr', e.target.value)}
              inputMode="numeric"
              className="h-9"
            />
          ) : (
            <p className="text-[15px] font-medium text-zinc-900">{details?.expected_mrr != null ? formatMrr(details.expected_mrr) : '-'}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">Payer</p>
          {editing ? (
            <Select
              value={val('payer', details?.payer ?? '')}
              onValueChange={(v) => onFieldChange?.('payer', v)}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {PAYER_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[15px] font-medium text-zinc-900">{details?.payer ?? '-'}</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">청구 방식</p>
          {editing ? (
            <Select
              value={val('billingMethod', details?.billing_method ?? '')}
              onValueChange={(v) => onFieldChange?.('billingMethod', v)}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {BILLING_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[15px] font-medium text-zinc-900">{details?.billing_method ?? '-'}</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">영업 담당</p>
          {editing ? (
            <Select
              value={val('salesRepId', details?.sales_rep_id ?? '')}
              onValueChange={(v) => onFieldChange?.('salesRepId', v)}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
              <SelectContent>
                {employees?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-[15px] font-medium text-zinc-900">{details?.sales_rep_name ?? '-'}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">AWS 금액</p>
          {editing ? (
            <Input
              value={val('awsAmount', String(details?.aws_amount ?? ''))}
              onChange={(e) => onFieldChange?.('awsAmount', e.target.value)}
              inputMode="numeric"
              className="h-9"
            />
          ) : (
            <p className="text-[15px] font-medium text-zinc-900">{details?.aws_amount != null ? formatMrr(details.aws_amount) : '-'}</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">AWS AM</p>
          {editing ? (
            <Input
              value={val('awsAm', details?.aws_am ?? '')}
              onChange={(e) => onFieldChange?.('awsAm', e.target.value)}
              className="h-9"
              placeholder="AWS 담당자명"
            />
          ) : (
            <p className="text-[15px] font-medium text-zinc-900">{details?.aws_am ?? '-'}</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">빌링온</p>
          {editing ? (
            <div className="flex h-9 rounded-md bg-zinc-100 p-1 gap-1">
              <button
                type="button"
                onClick={() => onFieldChange?.('billingOn', 'true')}
                className={`flex-1 rounded text-[12px] font-medium transition-colors ${
                  val('billingOn', details?.billing_on ? 'true' : 'false') === 'true'
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
                  val('billingOn', details?.billing_on ? 'true' : 'false') === 'false'
                    ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                    : 'text-zinc-400'
                }`}
              >
                미등록
              </button>
            </div>
          ) : (
            <span className={`inline-block rounded px-2.5 py-0.5 text-[13px] font-semibold ${
              details?.billing_on ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
            }`}>
              {details?.billing_on ? '등록' : '미등록'}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-400">빌링온 별칭</p>
        {editing ? (
          <Input
            value={val('billingOnAlias', details?.billing_on_alias ?? '')}
            onChange={(e) => onFieldChange?.('billingOnAlias', e.target.value)}
            className="h-9"
            placeholder="빌링온 계정 별칭"
          />
        ) : (
          <p className="text-[15px] font-medium text-zinc-900">{details?.billing_on_alias || '-'}</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-400">AWS 계정 ID</p>
        {editing ? (
          <Input
            value={val('awsAccountIds', (details?.aws_account_ids ?? []).join(', '))}
            onChange={(e) => onFieldChange?.('awsAccountIds', e.target.value)}
            className="h-9"
            placeholder="쉼표로 구분 (예: 123456789012, 987654321098)"
          />
        ) : details?.aws_account_ids && details.aws_account_ids.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {details.aws_account_ids.map((id) => (
              <span key={id} className="rounded-md bg-blue-50 px-2 py-0.5 text-[13px] font-medium text-blue-600">
                {id}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[15px] font-medium text-zinc-900">-</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-400">담당 기술</p>
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
              <span key={t.employee_id} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[13px] font-medium text-zinc-700">
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[15px] font-medium text-zinc-900">-</p>
        )}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-400">태그</p>
        {editing ? (
          <Input
            value={val('tags', (details?.tags ?? []).join(', '))}
            onChange={(e) => onFieldChange?.('tags', e.target.value)}
            className="h-9"
            placeholder="쉼표로 구분 (예: 빠른결정, 기술중심)"
          />
        ) : details?.tags && details.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {details.tags.map((t) => (
              <span key={t} className="rounded-md bg-zinc-100 px-2 py-0.5 text-[13px] font-medium text-zinc-700">
                {t}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[15px] font-medium text-zinc-900">-</p>
        )}
      </div>
    </div>
  );
}

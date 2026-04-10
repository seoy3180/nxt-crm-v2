'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmployees } from '@/hooks/use-employees';
import { CREDIT_SHARE_OPTIONS, PAYER_OPTIONS, BILLING_METHOD_OPTIONS } from '@/lib/constants';
import type { MspDetailRow } from '@/lib/services/contract-service';

interface MspDetailCardProps {
  details: MspDetailRow | null;
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

export function MspDetailCard({ details, editing, editValues, onFieldChange }: MspDetailCardProps) {
  const { data: employees } = useEmployees();

  if (!details && !editing) return null;

  const val = (field: string, fallback: string) => editing ? (editValues?.[field] ?? fallback) : fallback;

  return (
    <div className="rounded-xl border border-zinc-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">MSP 상세</h3>
        <span className="inline-block rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600">MSP</span>
      </div>

      <div className="grid grid-cols-3 gap-8">
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
      </div>

      <div className="h-px bg-zinc-100" />

      <div className="grid grid-cols-3 gap-8">
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
      </div>
    </div>
  );
}

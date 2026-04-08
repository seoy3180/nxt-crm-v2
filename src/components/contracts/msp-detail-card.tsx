'use client';

import type { MspDetailRow } from '@/lib/services/contract-service';

interface MspDetailCardProps {
  details: MspDetailRow | null;
}

function formatMrr(amount: number) {
  if (amount >= 10000) {
    return `₩ ${Math.round(amount / 10000).toLocaleString()}만`;
  }
  return `₩ ${amount.toLocaleString()}`;
}

export function MspDetailCard({ details }: MspDetailCardProps) {
  if (!details) return null;

  return (
    <div className="rounded-xl border border-zinc-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">MSP 상세</h3>
        <span className="inline-block rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600">MSP</span>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">빌링 레벨</p>
          <p className="text-[15px] font-medium text-zinc-900">{details.billing_level ?? '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">크레딧 쉐어</p>
          <p className="text-[15px] font-medium text-zinc-900">{details.credit_share != null ? `${details.credit_share}%` : '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">예상 MRR</p>
          <p className="text-[15px] font-medium text-zinc-900">{details.expected_mrr != null ? formatMrr(details.expected_mrr) : '-'}</p>
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">결제자</p>
          <p className="text-[15px] font-medium text-zinc-900">{details.payer ?? '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">영업 담당</p>
          <p className="text-[15px] font-medium text-zinc-900">{details.sales_rep ?? '-'}</p>
        </div>
        <div />
      </div>
    </div>
  );
}

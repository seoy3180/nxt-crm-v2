'use client';

import Link from 'next/link';
import type { ContractRow } from '@/lib/services/contract-service';

function formatFullAmount(amount: number) {
  return `₩ ${new Intl.NumberFormat('ko-KR').format(amount)}`;
}

interface ContractInfoCardProps {
  contract: ContractRow;
}

export function ContractInfoCard({ contract }: ContractInfoCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 p-6 space-y-5">
      <h3 className="text-lg font-semibold text-zinc-900">계약 정보</h3>

      <div className="grid grid-cols-3 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">총 금액</p>
          <p className="text-base font-semibold text-zinc-900">{formatFullAmount(contract.total_amount)}</p>
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
          <p className="text-base font-medium text-zinc-900">{contract.assigned_to_name ?? '-'}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">고객사 담당자</p>
          <p className="text-base font-medium text-zinc-900">{contract.contact_name ?? '-'}</p>
        </div>
        <div />
      </div>
    </div>
  );
}

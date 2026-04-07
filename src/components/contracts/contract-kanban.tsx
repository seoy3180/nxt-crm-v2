'use client';

import { useRouter } from 'next/navigation';
import { MSP_STAGES, EDU_STAGES, BUSINESS_TYPES } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContractRow } from '@/lib/services/contract-service';

interface ContractKanbanProps {
  contracts: ContractRow[];
  loading?: boolean;
  contractType: string;
}

function formatAmount(amount: number) {
  if (amount >= 100000000) {
    return `₩ ${(amount / 100000000).toFixed(1)}억`;
  }
  if (amount >= 10000) {
    return `₩ ${Math.round(amount / 10000).toLocaleString()}만`;
  }
  return `₩ ${amount.toLocaleString()}`;
}

function KanbanCard({ contract }: { contract: ContractRow }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/contracts/${contract.id}`)}
      className="w-full rounded-lg border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-zinc-300"
    >
      <div className="space-y-2">
        <p className="text-[13px] font-medium text-zinc-900">{contract.name}</p>
        <p className="text-xs text-zinc-500">{contract.client_name ?? '-'}</p>
        <div className="flex items-center justify-between">
          <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
            {BUSINESS_TYPES[contract.type as keyof typeof BUSINESS_TYPES] ?? contract.type}
          </span>
          <span className="text-xs font-medium text-zinc-900">{formatAmount(contract.total_amount)}</span>
        </div>
        {contract.assigned_to_name && (
          <p className="text-[11px] text-zinc-400">{contract.assigned_to_name}</p>
        )}
      </div>
    </button>
  );
}

export function ContractKanban({ contracts, loading, contractType }: ContractKanbanProps) {
  const stages = contractType === 'msp' ? MSP_STAGES : contractType === 'tt' ? EDU_STAGES : MSP_STAGES;

  if (loading) {
    return (
      <div className="flex flex-1 gap-4">
        {stages.map((s) => (
          <div key={s.value} className="flex-1 rounded-xl bg-zinc-50 p-3">
            <Skeleton className="mb-3 h-5 w-20" />
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 단계별 그룹핑
  const grouped = new Map<string, ContractRow[]>();
  stages.forEach((s) => grouped.set(s.value, []));
  contracts.forEach((c) => {
    const stageContracts = grouped.get(c.stage ?? '') ?? [];
    stageContracts.push(c);
    if (c.stage) grouped.set(c.stage, stageContracts);
  });

  return (
    <div className="flex flex-1 gap-4">
      {stages.map((stage) => {
        const stageContracts = grouped.get(stage.value) ?? [];
        return (
          <div key={stage.value} className="flex flex-1 flex-col gap-3 rounded-xl bg-zinc-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-zinc-700">{stage.label}</span>
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                {stageContracts.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
              {stageContracts.length === 0 ? (
                <p className="py-8 text-center text-xs text-zinc-400">계약 없음</p>
              ) : (
                stageContracts.map((contract) => (
                  <KanbanCard key={contract.id} contract={contract} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

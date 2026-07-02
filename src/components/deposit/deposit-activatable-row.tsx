'use client';

import { useActivateDeposit } from '@/hooks/use-deposit-mutations';
import type { ActivatableContract } from '@/lib/services/deposit-service';

/**
 * 예치금 미설정/비활성 MSP 계약 한 줄 + 활성화 버튼.
 * 미설정 탭에서 사용. 활성화 권한(admin·c_level·team_lead)자에게만 버튼 노출.
 */
export function DepositActivatableRow({
  contract,
  canManage,
}: {
  contract: ActivatableContract;
  canManage: boolean;
}) {
  const activate = useActivateDeposit();

  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-zinc-800">{contract.name}</p>
        <p className="truncate text-xs text-zinc-400">
          {contract.client_name ?? '—'} · {contract.contract_id}
          {contract.hasDeactivated && <span className="ml-1 text-amber-500">· 이전 비활성</span>}
        </p>
      </div>
      {canManage && (
        <button
          type="button"
          onClick={() => activate.mutate({ contractId: contract.id })}
          disabled={activate.isPending}
          className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {activate.isPending ? '처리 중...' : contract.hasDeactivated ? '재활성화' : '활성화'}
        </button>
      )}
    </div>
  );
}

import Link from 'next/link';
import { Wallet } from 'lucide-react';

/**
 * 활성화된 예치금 계좌가 0건일 때 표시.
 * "100% 수동 활성화" 정책(PRD 2-2) — MSP 계약 상세에서 활성화해야 함.
 */
export function DepositEmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
        <Wallet className="h-8 w-8 text-zinc-400" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-900">아직 등록된 예치금 계좌가 없습니다</h2>
        <p className="text-sm text-zinc-500">MSP 계약 상세 페이지에서 예치금 계좌를 활성화하세요.</p>
      </div>
      <Link
        href="/msp/contracts"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        MSP 계약 목록 보기
      </Link>
    </div>
  );
}

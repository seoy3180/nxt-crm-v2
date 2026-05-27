'use client';

import { useState } from 'react';
import { Wallet, CircleAlert } from 'lucide-react';
import { useDepositAccountByContract } from '@/hooks/use-deposit-account';
import { useDepositTransactions } from '@/hooks/use-deposit-transactions';
import {
  calcAvgMonthlyUsage,
  calcDaysUntilDepleted,
  calcBalancePct,
  calcAlertLevel,
} from '@/lib/deposit/calc-balance';
import { DepositTransactionsTable } from './deposit-transactions-table';
import { DepositTxnModal } from './modals/deposit-txn-modal';
import { DepositVoidModal } from './modals/deposit-void-modal';
import { DepositActivateModal } from './modals/deposit-activate-modal';
import { DepositDeactivateModal } from './modals/deposit-deactivate-modal';
import type { AlertLevel, DepositTxnType } from '@/lib/deposit/types';

const ALERT_STYLES: Record<AlertLevel, { balBg: string; balText: string; bar: string; badge: string }> = {
  critical: { balBg: 'bg-red-50', balText: 'text-red-700', bar: 'bg-red-500', badge: 'bg-red-50 text-red-700' },
  warning: { balBg: 'bg-amber-50', balText: 'text-amber-700', bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
  ok: { balBg: 'bg-emerald-50', balText: 'text-emerald-700', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
};

interface Props {
  contractId: string;
  currency: 'USD' | 'KRW';
  /** 보정·환불·활성·비활성·재활성 등 운영 액션 권한 (admin·c_level·team_lead) */
  canManage: boolean;
}

/**
 * 계약 상세의 "예치금" 탭 본체.
 *
 * 상태 분기:
 * - 비활성 (계좌 없음) → 안내 + 활성화 버튼
 * - 활성 + 트랜잭션 0건 → Empty (잔액 0)
 * - 활성 + 트랜잭션 있음 → 풀폭 카드 + 거래 테이블
 */
export function DepositAccountDetail({ contractId, currency, canManage }: Props) {
  const { data: account, isLoading: accountLoading } = useDepositAccountByContract(contractId);
  const { data: txns = [], isLoading: txnLoading } = useDepositTransactions(account?.id ?? null);
  const [modal, setModal] = useState<
    | null
    | { kind: 'activate' }
    | { kind: 'deactivate' }
    | { kind: 'txn'; type: DepositTxnType }
    | { kind: 'void'; id: string }
  >(null);

  if (accountLoading) {
    return <div className="p-6 text-sm text-zinc-400">불러오는 중...</div>;
  }

  // 비활성 상태
  if (!account) {
    return (
      <>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-12 text-center">
          <Wallet className="mx-auto h-10 w-10 text-zinc-300" />
          <p className="mt-3 text-sm text-zinc-500">
            이 계약은 아직 예치금 추적이 활성화되지 않았습니다.
          </p>
          <button
            type="button"
            onClick={() => setModal({ kind: 'activate' })}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            예치금 계좌 활성화
          </button>
        </div>
        <DepositActivateModal
          open={modal?.kind === 'activate'}
          onOpenChange={(o) => !o && setModal(null)}
          contractId={contractId}
        />
      </>
    );
  }

  // 활성 상태
  const avgMonthly = calcAvgMonthlyUsage(account, txns);
  const days = calcDaysUntilDepleted(account.balance, avgMonthly);
  const pct = calcBalancePct(account);
  const level = calcAlertLevel(account, avgMonthly);
  const style = ALERT_STYLES[level];

  const sym = currency === 'USD' ? '$' : '₩';
  const fmt = (n: number) => `${sym} ${new Intl.NumberFormat('ko-KR').format(Math.abs(n))}`;
  const fmtSigned = (n: number) => (n < 0 ? `−${fmt(n)}` : fmt(n));

  return (
    <div className="space-y-5">
      {/* 풀폭 카드 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">예치금 계좌</h3>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
              {level !== 'ok' && <CircleAlert className="h-3 w-3" />}
              {level === 'critical' ? '긴급' : level === 'warning' ? '주의' : '정상'}
            </span>
            {canManage && (
              <button
                type="button"
                onClick={() => setModal({ kind: 'deactivate' })}
                className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] text-zinc-500 hover:bg-zinc-50"
                title={account.balance !== 0 ? '잔액이 0이 아니면 비활성화 불가' : '계좌 비활성화'}
              >
                비활성화
              </button>
            )}
          </div>
        </div>

        {/* 잔액 강조 */}
        <div className={`rounded-lg ${style.balBg} p-5`}>
          <div className="flex items-center gap-2">
            <Wallet className={`h-4 w-4 ${style.balText}`} />
            <span className={`text-xs font-medium ${style.balText}`}>현재 잔액</span>
          </div>
          <p className={`mt-1 text-3xl font-bold ${style.balText}`}>{fmtSigned(account.balance)}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/60">
            <div className={`h-full ${style.bar}`} style={{ width: `${Math.max(0, Math.min(pct, 100))}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            예치액 {fmt(account.total_deposit)} 대비 {pct.toFixed(1)}%
          </p>
        </div>

        {/* 입출 요약 + 소진 예측 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-[10px] text-zinc-400">총 예치</p>
            <p className="text-sm font-bold text-zinc-700">{fmt(account.total_deposit)}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-[10px] text-zinc-400">누적 차감</p>
            <p className="text-sm font-bold text-zinc-700">{fmt(account.total_usage)}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-[10px] text-zinc-400">월평균 소진</p>
            <p className="text-sm font-bold text-zinc-700">{fmt(avgMonthly)}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-[10px] text-zinc-400">소진 예상</p>
            <p className={`text-sm font-bold ${level === 'critical' ? 'text-red-600' : 'text-zinc-700'}`}>
              {Number.isFinite(days) ? `${(days / 30).toFixed(1)}개월` : '—'}
            </p>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => setModal({ kind: 'txn', type: 'deposit' })}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + 예치 등록
          </button>
          <button
            type="button"
            onClick={() => setModal({ kind: 'txn', type: 'usage' })}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            − 사용 차감
          </button>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setModal({ kind: 'txn', type: 'adjustment' })}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                잔액 보정
              </button>
              <button
                type="button"
                onClick={() => setModal({ kind: 'txn', type: 'refund' })}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                환불 등록
              </button>
            </>
          )}
        </div>
      </div>

      {/* 거래 내역 */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">거래 내역</h3>
        <DepositTransactionsTable
          transactions={txns}
          currency={currency}
          isLoading={txnLoading}
          onVoid={(id) => setModal({ kind: 'void', id })}
        />
      </div>

      {/* 모달들 */}
      {modal?.kind === 'txn' && (
        <DepositTxnModal
          open
          onOpenChange={(o) => !o && setModal(null)}
          accountId={account.id}
          txnType={modal.type}
          currency={currency}
          currentBalance={account.balance}
        />
      )}
      {modal?.kind === 'void' && (
        <DepositVoidModal open onOpenChange={(o) => !o && setModal(null)} txnId={modal.id} />
      )}
      <DepositDeactivateModal
        open={modal?.kind === 'deactivate'}
        onOpenChange={(o) => !o && setModal(null)}
        accountId={account.id}
        balanceNotZero={account.balance !== 0}
      />
    </div>
  );
}

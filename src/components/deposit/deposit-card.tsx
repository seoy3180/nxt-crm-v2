'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wallet, TrendingDown, CircleAlert, ExternalLink } from 'lucide-react';
import { useDepositTransactions } from '@/hooks/use-deposit-transactions';
import { useSectionBasePath } from '@/hooks/use-section-base-path';
import { DepositTxnModal } from './modals/deposit-txn-modal';
import type { DepositAccountWithMetrics } from '@/lib/services/deposit-service';
import type { AlertLevel } from '@/lib/deposit/types';

const ALERT_STYLES: Record<AlertLevel, { border: string; badgeBg: string; badgeText: string; balBg: string; balText: string; bar: string }> = {
  critical: {
    border: 'border-red-300',
    badgeBg: 'bg-red-50 text-red-700',
    badgeText: '긴급',
    balBg: 'bg-red-50',
    balText: 'text-red-700',
    bar: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-300',
    badgeBg: 'bg-amber-50 text-amber-700',
    badgeText: '주의',
    balBg: 'bg-amber-50',
    balText: 'text-amber-700',
    bar: 'bg-amber-500',
  },
  ok: {
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-700',
    badgeText: '정상',
    balBg: 'bg-emerald-50',
    balText: 'text-emerald-700',
    bar: 'bg-emerald-500',
  },
};

export function DepositCard({ account }: { account: DepositAccountWithMetrics }) {
  const { data: txns = [] } = useDepositTransactions(account.id);
  const basePath = useSectionBasePath();
  const [modalType, setModalType] = useState<null | 'deposit' | 'usage'>(null);

  const { avgMonthlyUsage: avgMonthly, daysUntilDepleted: days, balancePct: pct, alertLevel: level } = account.metrics;
  const style = ALERT_STYLES[level];

  const currency = account.contract.currency;
  const fmt = (n: number) => `${currency === 'USD' ? '$' : '₩'} ${new Intl.NumberFormat('ko-KR').format(Math.abs(n))}`;
  const fmtSigned = (n: number) => (n < 0 ? `−${fmt(n)}` : fmt(n));

  const recentTxns = txns.slice(0, 4);

  return (
    <div className={`flex flex-col rounded-xl border bg-white p-5 space-y-4 ${style.border}`}>
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-zinc-900">{account.contract.name}</h3>
          <p className="truncate text-xs text-zinc-400">{account.contract.client_name ?? '—'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${style.badgeBg}`}>
            {level !== 'ok' && <CircleAlert className="h-3 w-3" />}
            {style.badgeText}
          </span>
          <Link
            href={`${basePath}/contracts/${account.contract.id}`}
            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
            title="계약 상세로 이동"
          >
            상세 <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* 잔액 KPI */}
      <div className={`rounded-lg ${style.balBg} p-4`}>
        <div className="flex items-center gap-2">
          <Wallet className={`h-4 w-4 ${style.balText}`} />
          <span className={`text-[10px] font-medium ${style.balText}`}>현재 잔액 (예치금)</span>
        </div>
        <p className={`mt-1 text-2xl font-bold ${style.balText}`}>{fmtSigned(account.balance)}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
          <div
            className={`h-full ${style.bar}`}
            style={{ width: `${Math.max(0, Math.min(pct, 100))}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-zinc-500">예치액 대비 {pct.toFixed(1)}%</p>
      </div>

      {/* 입출 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-[10px] text-zinc-400">총 예치 (입금)</p>
          <p className="text-sm font-bold text-zinc-700">{fmt(account.total_deposit)}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-[10px] text-zinc-400">누적 차감 (사용)</p>
          <p className="text-sm font-bold text-zinc-700">{fmt(account.total_usage)}</p>
        </div>
      </div>

      {/* 소진 예측 */}
      <div className="rounded-lg border border-zinc-100 p-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-zinc-500">
            <TrendingDown className="h-3 w-3" />월평균 소진
          </span>
          <span className="font-semibold text-zinc-700">{fmt(avgMonthly)} / 월</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">소진 예상</span>
          <span className={`font-semibold ${level === 'critical' ? 'text-red-600' : level === 'warning' ? 'text-amber-600' : 'text-zinc-700'}`}>
            {Number.isFinite(days) ? `${(days / 30).toFixed(1)}개월 (~${days}일)` : '—'}
          </span>
        </div>
      </div>

      {/* 최근 거래내역 */}
      {recentTxns.length > 0 && (
        <div className="border-t pt-3">
          <p className="mb-2 text-[11px] font-semibold text-zinc-500">최근 입출 내역</p>
          <div className="space-y-1">
            {recentTxns.map((t) => {
              const isVoided = !!t.voided_at;
              const isPlus = t.txn_type === 'deposit' || (t.txn_type === 'adjustment' && t.amount > 0);
              return (
                <div
                  key={t.id}
                  className={`flex items-center justify-between text-[11px] ${isVoided ? 'opacity-50 line-through' : ''}`}
                >
                  <span className="text-zinc-400">{t.txn_date}</span>
                  <span className={isPlus ? 'text-emerald-600' : 'text-rose-600'}>
                    {isPlus ? '+ ' : '− '}{fmt(t.amount)}
                  </span>
                  <span className="truncate max-w-[120px] text-zinc-400">{t.memo ?? '-'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 액션 버튼 — 카드 높이 다를 때도 항상 하단 정렬 */}
      <div className="mt-auto flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => setModalType('deposit')}
          className="flex-1 h-8 rounded-md border border-zinc-200 text-[12px] text-zinc-600 hover:bg-zinc-50"
        >
          + 예치 등록
        </button>
        <button
          type="button"
          onClick={() => setModalType('usage')}
          className="flex-1 h-8 rounded-md border border-zinc-200 text-[12px] text-zinc-600 hover:bg-zinc-50"
        >
          − 사용 차감
        </button>
      </div>

      {modalType && (
        <DepositTxnModal
          open
          onOpenChange={(o) => !o && setModalType(null)}
          accountId={account.id}
          txnType={modalType}
          currency={currency}
          currentBalance={account.balance}
        />
      )}
    </div>
  );
}


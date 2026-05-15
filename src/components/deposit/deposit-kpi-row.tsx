'use client';

import { AlertTriangle } from 'lucide-react';
import { DEPOSIT_ALERT_THRESHOLDS } from '@/lib/deposit/constants';
import type { DepositAccountWithContract } from '@/lib/services/deposit-service';

function fmt(n: number, cur: 'USD' | 'KRW') {
  return `${cur === 'USD' ? '$' : '₩'} ${new Intl.NumberFormat('ko-KR').format(n)}`;
}

/**
 * 전역 KPI 4박스 (PRD 옵션 C: USD/KRW 별도 트랙, 환산 합산 X).
 *
 * "알림 필요" 카운트는 1차 판정만 사용 (트랜잭션 미조회). 카드 단에서 정밀 판정.
 */
export function DepositKpiRow({ accounts }: { accounts: DepositAccountWithContract[] }) {
  const split = (cur: 'USD' | 'KRW') => {
    const list = accounts.filter((a) => a.contract.currency === cur);
    return {
      count: list.length,
      balance: list.reduce((s, a) => s + a.balance, 0),
      deposit: list.reduce((s, a) => s + a.total_deposit, 0),
      usage: list.reduce((s, a) => s + a.total_usage, 0),
    };
  };
  const usd = split('USD');
  const krw = split('KRW');

  const critical = accounts.filter((a) => {
    if (a.balance < 0) return true;
    if (a.total_deposit <= 0) return false;
    return (a.balance / a.total_deposit) * 100 < DEPOSIT_ALERT_THRESHOLDS.critical.balancePct;
  }).length;

  const warning = accounts.filter((a) => {
    if (a.balance < 0) return false;
    if (a.total_deposit <= 0) return false;
    const pct = (a.balance / a.total_deposit) * 100;
    return (
      pct >= DEPOSIT_ALERT_THRESHOLDS.critical.balancePct &&
      pct < DEPOSIT_ALERT_THRESHOLDS.warning.balancePct
    );
  }).length;

  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiBox label="총 예치액" sub={`USD ${usd.count}건 · KRW ${krw.count}건`}>
        <p>{fmt(usd.deposit, 'USD')}</p>
        <p>{fmt(krw.deposit, 'KRW')}</p>
      </KpiBox>
      <KpiBox
        label="누적 사용액"
        sub={`예치 대비 ${usd.deposit > 0 ? Math.round((usd.usage / usd.deposit) * 100) : 0}% / ${krw.deposit > 0 ? Math.round((krw.usage / krw.deposit) * 100) : 0}%`}
      >
        <p>{fmt(usd.usage, 'USD')}</p>
        <p>{fmt(krw.usage, 'KRW')}</p>
      </KpiBox>
      <KpiBox label="현재 잔액" tone="emerald" sub="통화별 별도 트랙 (환산 X)">
        <p>{fmt(usd.balance, 'USD')}</p>
        <p>{fmt(krw.balance, 'KRW')}</p>
      </KpiBox>
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3" />알림 필요
        </p>
        <p className="mt-1 text-2xl font-bold text-red-700">
          {critical}
          <span className="ml-1 text-sm font-normal text-red-500">긴급</span>
        </p>
        <p className="text-base font-bold text-amber-600">
          {warning}
          <span className="ml-1 text-xs font-normal text-amber-500">주의</span>
        </p>
        <p className="mt-1 text-[10px] text-red-500/70">통화 무관 합산</p>
      </div>
    </div>
  );
}

function KpiBox({
  label,
  sub,
  tone,
  children,
}: {
  label: string;
  sub?: string;
  tone?: 'emerald';
  children: React.ReactNode;
}) {
  const boxCls =
    tone === 'emerald'
      ? 'rounded-xl border border-emerald-200 bg-emerald-50 p-5'
      : 'rounded-xl border border-zinc-200 bg-white p-5';
  const textCls = tone === 'emerald' ? 'text-emerald-700' : 'text-zinc-900';
  const labelCls = tone === 'emerald' ? 'text-emerald-600' : 'text-zinc-400';
  const subCls = tone === 'emerald' ? 'text-emerald-600/70' : 'text-zinc-400';
  return (
    <div className={boxCls}>
      <p className={`text-xs ${labelCls}`}>{label}</p>
      <div className={`mt-1 space-y-0.5 text-lg font-bold ${textCls}`}>{children}</div>
      {sub && <p className={`mt-1 text-[10px] ${subCls}`}>{sub}</p>}
    </div>
  );
}

'use client';

/**
 * 예치금 대시보드 — A안: 운영 관점
 *
 * 목적: 영업/고객 케어 팀이 고객별 잔액과 소진율을 실시간으로 추적하고
 *       추가 충전 영업 타이밍을 잡기 위한 대시보드.
 *
 * 핵심 데이터:
 * - 예치 트랜잭션 (입금 + / 차감 -)
 * - 현재 잔액
 * - 월평균 소진액 → 잔액 소진 예상 시점
 * - 임계 알림 (잔액 < 20%, 30일 이내 소진 예상)
 */

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { AlertTriangle, TrendingDown, Wallet, CircleAlert } from 'lucide-react';

const NOW = new Date('2026-05-08');

// ─── 가짜 데이터: 예치 트랜잭션 ────────────────────────────

interface DepositTxn {
  date: string;
  type: 'deposit' | 'usage';
  amount: number;
  memo?: string;
}

interface DepositAccount {
  id: string;
  contractName: string;
  client: string;
  currency: 'KRW' | 'USD';
  txns: DepositTxn[];
  payerAccount?: string; // AWS Payer 계정 ID
}

const ACCOUNTS: DepositAccount[] = [
  {
    id: '1',
    contractName: '한이음 드림업 MSP',
    client: '한이음 드림업',
    currency: 'USD',
    payerAccount: '123456789012',
    txns: [
      { date: '2026-01-05', type: 'deposit', amount: 12000, memo: '연간 선결제 입금' },
      { date: '2026-01-31', type: 'usage', amount: -980, memo: 'AWS 1월 사용분' },
      { date: '2026-02-28', type: 'usage', amount: -1050, memo: 'AWS 2월 사용분' },
      { date: '2026-03-31', type: 'usage', amount: -920, memo: 'AWS 3월 사용분' },
      { date: '2026-04-30', type: 'usage', amount: -1100, memo: 'AWS 4월 사용분' },
    ],
  },
  {
    id: '2',
    contractName: '동국대학교 DSLAB MSP',
    client: 'DSLAB',
    currency: 'USD',
    payerAccount: '987654321098',
    txns: [
      { date: '2026-04-01', type: 'deposit', amount: 6000, memo: '6개월 선결제' },
      { date: '2026-04-30', type: 'usage', amount: -850, memo: 'AWS 4월 사용분' },
    ],
  },
  {
    id: '3',
    contractName: '자일로시스템즈 MSP',
    client: '자일로시스템즈',
    currency: 'KRW',
    payerAccount: '456789012345',
    txns: [
      { date: '2026-03-15', type: 'deposit', amount: 5000000, memo: '초기 예치' },
      { date: '2026-03-31', type: 'usage', amount: -1180000 },
      { date: '2026-04-30', type: 'usage', amount: -1220000 },
    ],
  },
  {
    id: '4',
    contractName: '비트팩토리 MSP',
    client: '비트팩토리',
    currency: 'USD',
    payerAccount: '111222333444',
    txns: [
      { date: '2026-02-01', type: 'deposit', amount: 3000, memo: '3개월분 예치' },
      { date: '2026-02-28', type: 'usage', amount: -890 },
      { date: '2026-03-31', type: 'usage', amount: -950 },
      { date: '2026-04-30', type: 'usage', amount: -1080 },
    ],
  },
];

// ─── 유틸 ─────────────────────────────────────────────

function formatAmount(n: number, currency: string) {
  const sym = currency === 'USD' ? '$' : '₩';
  return `${sym} ${new Intl.NumberFormat('ko-KR').format(Math.round(n))}`;
}

function calcStats(acc: DepositAccount) {
  const totalDeposit = acc.txns.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalUsage = Math.abs(acc.txns.filter((t) => t.type === 'usage').reduce((s, t) => s + t.amount, 0));
  const balance = totalDeposit - totalUsage;

  const usageTxns = acc.txns.filter((t) => t.type === 'usage');
  const avgMonthlyUsage = usageTxns.length > 0 ? totalUsage / usageTxns.length : 0;
  const monthsUntilDepleted = avgMonthlyUsage > 0 ? balance / avgMonthlyUsage : Infinity;
  const daysUntilDepleted = monthsUntilDepleted * 30;

  const balancePct = totalDeposit > 0 ? (balance / totalDeposit) * 100 : 0;

  return { totalDeposit, totalUsage, balance, avgMonthlyUsage, monthsUntilDepleted, daysUntilDepleted, balancePct };
}

function alertLevel(pct: number, days: number): 'critical' | 'warning' | 'ok' {
  if (pct < 10 || days < 14) return 'critical';
  if (pct < 25 || days < 45) return 'warning';
  return 'ok';
}

// ─── 잔액 추이 라인차트 ──────────────────────────────────

function BalanceTrend({ acc }: { acc: DepositAccount }) {
  let running = 0;
  const points = acc.txns.map((t) => {
    running += t.amount;
    return { date: t.date.slice(5), balance: running };
  });

  const stats = calcStats(acc);
  const projectionPoints: { date: string; balance: number }[] = [];
  const lastTxn = acc.txns[acc.txns.length - 1];
  if (stats.avgMonthlyUsage > 0 && stats.balance > 0 && lastTxn) {
    const lastDate = new Date(lastTxn.date);
    let projBalance = stats.balance;
    for (let i = 1; i <= 6; i++) {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + i);
      projBalance -= stats.avgMonthlyUsage;
      projectionPoints.push({ date: `${String(d.getMonth() + 1).padStart(2, '0')}-예측`, balance: Math.max(projBalance, 0) });
      if (projBalance <= 0) break;
    }
  }

  const data = [...points, ...projectionPoints];

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
        <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── 계좌 카드 ─────────────────────────────────────────

function AccountCard({ acc }: { acc: DepositAccount }) {
  const stats = calcStats(acc);
  const level = alertLevel(stats.balancePct, stats.daysUntilDepleted);

  const alertStyles = {
    critical: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', label: '긴급' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700', label: '주의' },
    ok: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: '정상' },
  }[level];

  return (
    <div className={`rounded-xl border ${alertStyles.border} bg-white p-5 space-y-4`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{acc.contractName}</h3>
          <p className="text-xs text-zinc-400">{acc.client}{acc.payerAccount && ` · Payer ${acc.payerAccount}`}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${alertStyles.bg} ${alertStyles.text}`}>
          {level !== 'ok' && <CircleAlert className="h-3 w-3" />}
          {alertStyles.label}
        </span>
      </div>

      {/* 잔액 KPI */}
      <div className={`rounded-lg ${alertStyles.bg} p-4`}>
        <div className="flex items-center gap-2">
          <Wallet className={`h-4 w-4 ${alertStyles.text}`} />
          <span className={`text-[10px] font-medium ${alertStyles.text}`}>현재 잔액 (예치금)</span>
        </div>
        <p className={`mt-1 text-2xl font-bold ${alertStyles.text}`}>{formatAmount(stats.balance, acc.currency)}</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/60">
          <div
            className={`h-full ${level === 'critical' ? 'bg-red-500' : level === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.max(stats.balancePct, 0)}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-zinc-500">예치액 대비 {stats.balancePct.toFixed(1)}%</p>
      </div>

      {/* 입출 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-[10px] text-zinc-400">총 예치 (입금)</p>
          <p className="text-sm font-bold text-zinc-700">{formatAmount(stats.totalDeposit, acc.currency)}</p>
        </div>
        <div className="rounded-lg bg-zinc-50 p-3">
          <p className="text-[10px] text-zinc-400">누적 차감 (사용)</p>
          <p className="text-sm font-bold text-zinc-700">{formatAmount(stats.totalUsage, acc.currency)}</p>
        </div>
      </div>

      {/* 소진 예측 */}
      <div className="rounded-lg border border-zinc-100 p-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-zinc-500"><TrendingDown className="h-3 w-3" />월평균 소진</span>
          <span className="font-semibold text-zinc-700">{formatAmount(stats.avgMonthlyUsage, acc.currency)} / 월</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-500">소진 예상</span>
          <span className={`font-semibold ${level === 'critical' ? 'text-red-600' : level === 'warning' ? 'text-amber-600' : 'text-zinc-700'}`}>
            {Number.isFinite(stats.monthsUntilDepleted) ? `${stats.monthsUntilDepleted.toFixed(1)}개월 (~${Math.round(stats.daysUntilDepleted)}일)` : '—'}
          </span>
        </div>
      </div>

      {/* 잔액 추이 차트 */}
      <div className="border-t pt-3">
        <p className="mb-1 text-[11px] text-zinc-500">잔액 추이 (실선) + 예측 (점선)</p>
        <BalanceTrend acc={acc} />
      </div>

      {/* 트랜잭션 */}
      <div className="border-t pt-3">
        <p className="mb-2 text-[11px] font-semibold text-zinc-500">최근 입출 내역</p>
        <div className="space-y-1">
          {acc.txns.slice(-4).reverse().map((t, i) => (
            <div key={i} className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">{t.date}</span>
              <span className={t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}>
                {t.type === 'deposit' ? '+' : ''}{formatAmount(t.amount, acc.currency)}
              </span>
              <span className="text-zinc-400 truncate max-w-[120px]">{t.memo ?? '-'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 액션 */}
      <div className="flex gap-2 pt-2">
        <button className="flex-1 h-8 rounded-md border border-zinc-200 text-[12px] text-zinc-600 hover:bg-zinc-50">+ 예치 등록</button>
        <button className="flex-1 h-8 rounded-md bg-blue-600 text-[12px] font-semibold text-white hover:bg-blue-700">충전 영업</button>
      </div>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────

export default function DepositOperationPage() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');

  const accountsWithStats = ACCOUNTS.map((acc) => ({ acc, stats: calcStats(acc), level: alertLevel(calcStats(acc).balancePct, calcStats(acc).daysUntilDepleted) }));
  const filtered = accountsWithStats.filter(({ level }) => filter === 'all' || level === filter);

  const criticalCount = accountsWithStats.filter((a) => a.level === 'critical').length;
  const warningCount = accountsWithStats.filter((a) => a.level === 'warning').length;

  // 통화별 별도 트랙: 환율 환산 없이 USD/KRW 각각 합산
  const sumByCurrency = (cur: 'USD' | 'KRW') => {
    const list = accountsWithStats.filter((a) => a.acc.currency === cur);
    return {
      count: list.length,
      balance: list.reduce((s, a) => s + a.stats.balance, 0),
      deposit: list.reduce((s, a) => s + a.stats.totalDeposit, 0),
      usage: list.reduce((s, a) => s + a.stats.totalUsage, 0),
    };
  };
  const usd = sumByCurrency('USD');
  const krw = sumByCurrency('KRW');

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">A안 · 운영 관점</span>
            <a href="/test-ui-preview/deposit" className="text-xs text-zinc-400 hover:text-zinc-600">← 인덱스로</a>
            <a href="/test-ui-preview/deposit/accounting" className="text-xs text-zinc-400 hover:text-zinc-600">B안 회계 보기 →</a>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">예치금 대시보드 · 운영 관점</h1>
          <p className="mt-1 text-sm text-zinc-500">
            영업·고객 케어용. 고객별 예치금 잔액과 소진율을 추적하고 추가 충전 영업 타이밍을 알린다.
          </p>
        </div>

        {/* 글로벌 KPI — 옵션 C: 한 박스 안에 USD/KRW 두 줄 (환율 환산 X) */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-xs text-zinc-400">총 예치액</p>
            <p className="mt-1 text-lg font-bold text-zinc-900">{formatAmount(usd.deposit, 'USD')}</p>
            <p className="text-lg font-bold text-zinc-900">{formatAmount(krw.deposit, 'KRW')}</p>
            <p className="mt-0.5 text-[10px] text-zinc-400">USD {usd.count}건 · KRW {krw.count}건</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-xs text-zinc-400">누적 사용액</p>
            <p className="mt-1 text-lg font-bold text-zinc-700">{formatAmount(usd.usage, 'USD')}</p>
            <p className="text-lg font-bold text-zinc-700">{formatAmount(krw.usage, 'KRW')}</p>
            <p className="mt-0.5 text-[10px] text-zinc-400">예치 대비 {usd.deposit > 0 ? ((usd.usage / usd.deposit) * 100).toFixed(0) : 0}% / {krw.deposit > 0 ? ((krw.usage / krw.deposit) * 100).toFixed(0) : 0}%</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs text-emerald-600">현재 잔액</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">{formatAmount(usd.balance, 'USD')}</p>
            <p className="text-lg font-bold text-emerald-700">{formatAmount(krw.balance, 'KRW')}</p>
            <p className="mt-0.5 text-[10px] text-emerald-600/70">통화별 별도 트랙 (환산 X)</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-5">
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />알림 필요</p>
            <p className="mt-1 text-2xl font-bold text-red-700">{criticalCount}<span className="ml-1 text-sm font-normal text-red-500">긴급</span></p>
            <p className="text-base font-bold text-amber-600">{warningCount}<span className="ml-1 text-xs font-normal text-amber-500">주의</span></p>
            <p className="mt-0.5 text-[10px] text-red-500/70">통화 무관 합산</p>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2">
          <button onClick={() => setFilter('all')} className={`h-8 rounded-lg px-3 text-[13px] font-medium ${filter === 'all' ? 'bg-zinc-900 text-white' : 'bg-white border text-zinc-500'}`}>
            전체 ({accountsWithStats.length})
          </button>
          <button onClick={() => setFilter('critical')} className={`h-8 rounded-lg px-3 text-[13px] font-medium ${filter === 'critical' ? 'bg-red-600 text-white' : 'bg-white border text-zinc-500'}`}>
            긴급 ({criticalCount})
          </button>
          <button onClick={() => setFilter('warning')} className={`h-8 rounded-lg px-3 text-[13px] font-medium ${filter === 'warning' ? 'bg-amber-500 text-white' : 'bg-white border text-zinc-500'}`}>
            주의 ({warningCount})
          </button>
        </div>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(({ acc }) => <AccountCard key={acc.id} acc={acc} />)}
        </div>

        {/* 모델 설명 */}
        <div className="rounded-xl border bg-white p-5 space-y-2">
          <h3 className="font-semibold text-zinc-900">A안 (운영) 데이터 모델</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600">
            <li><code>deposit_accounts</code> — 계약별 예치금 계좌 (통화, Payer 매핑)</li>
            <li><code>deposit_transactions</code> — 입금(+) / 차감(−) 트랜잭션 로그</li>
            <li>잔액 = 입금 합 − 차감 합 (집계)</li>
            <li>차감 데이터 출처: AWS Cost Explorer API 자동 연동 또는 빌링온 수기</li>
            <li>알림 트리거: 잔액 &lt; 임계% 또는 소진 예상일 &lt; N일</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

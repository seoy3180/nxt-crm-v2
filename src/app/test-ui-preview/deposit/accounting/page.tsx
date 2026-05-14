'use client';

/**
 * 예치금 대시보드 — B안: 회계 인식 관점
 *
 * 목적: 재무팀/CFO가 월별 매출 인식 스케줄과 미인식 선수금(부채) 잔액을
 *       추적하기 위한 대시보드. K-IFRS 1115 수익인식 기준 반영.
 *
 * 핵심 데이터:
 * - 계약별 매출 인식 스케줄 (월별)
 * - 누적 인식 매출 vs 선수금 부채 잔액
 * - 인식 방식: 기간 균등 / 사용량 기준 / 일시 인식
 * - 결산 마감 상태
 */

import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Area, ComposedChart } from 'recharts';
import { CheckCircle2, Lock, FileText, BookOpen } from 'lucide-react';

const NOW = new Date('2026-05-08');

// ─── 데이터 모델 ─────────────────────────────────────

type RecognitionMethod = 'straight_line' | 'usage_based' | 'point_in_time';

interface RecognitionEntry {
  month: string; // YYYY-MM
  amount: number; // 인식할 금액
  status: 'closed' | 'pending' | 'projected'; // 마감 / 예정 / 예측
}

interface ContractRevenue {
  id: string;
  name: string;
  client: string;
  currency: 'KRW' | 'USD';
  contractAmount: number;
  startDate: string;
  endDate: string | null;
  method: RecognitionMethod;
  schedule: RecognitionEntry[];
}

const SAMPLE: ContractRevenue[] = [
  {
    id: '1',
    name: '한이음 드림업 MSP',
    client: '한이음 드림업',
    currency: 'USD',
    contractAmount: 12000,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    method: 'straight_line',
    schedule: [
      { month: '2026-01', amount: 1000, status: 'closed' },
      { month: '2026-02', amount: 1000, status: 'closed' },
      { month: '2026-03', amount: 1000, status: 'closed' },
      { month: '2026-04', amount: 1000, status: 'closed' },
      { month: '2026-05', amount: 1000, status: 'pending' },
      { month: '2026-06', amount: 1000, status: 'projected' },
      { month: '2026-07', amount: 1000, status: 'projected' },
      { month: '2026-08', amount: 1000, status: 'projected' },
      { month: '2026-09', amount: 1000, status: 'projected' },
      { month: '2026-10', amount: 1000, status: 'projected' },
      { month: '2026-11', amount: 1000, status: 'projected' },
      { month: '2026-12', amount: 1000, status: 'projected' },
    ],
  },
  {
    id: '2',
    name: 'DSLAB 6개월 MSP',
    client: 'DSLAB',
    currency: 'USD',
    contractAmount: 6000,
    startDate: '2026-04-01',
    endDate: '2026-09-30',
    method: 'straight_line',
    schedule: [
      { month: '2026-04', amount: 1000, status: 'closed' },
      { month: '2026-05', amount: 1000, status: 'pending' },
      { month: '2026-06', amount: 1000, status: 'projected' },
      { month: '2026-07', amount: 1000, status: 'projected' },
      { month: '2026-08', amount: 1000, status: 'projected' },
      { month: '2026-09', amount: 1000, status: 'projected' },
    ],
  },
  {
    id: '3',
    name: '자일로시스템즈 MSP',
    client: '자일로시스템즈',
    currency: 'KRW',
    contractAmount: 0, // 무기한
    startDate: '2026-01-01',
    endDate: null,
    method: 'usage_based',
    schedule: [
      { month: '2026-01', amount: 1180000, status: 'closed' },
      { month: '2026-02', amount: 1220000, status: 'closed' },
      { month: '2026-03', amount: 1190000, status: 'closed' },
      { month: '2026-04', amount: 1300000, status: 'closed' },
      { month: '2026-05', amount: 1250000, status: 'pending' },
    ],
  },
  {
    id: '4',
    name: '한이음 드림업 (공공) MSP',
    client: '한이음 드림업',
    currency: 'KRW',
    contractAmount: 50000000,
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    method: 'point_in_time',
    schedule: [
      { month: '2026-08', amount: 50000000, status: 'projected' },
    ],
  },
];

// ─── 유틸 ─────────────────────────────────────────────

function formatAmount(n: number, currency: string) {
  const sym = currency === 'USD' ? '$' : '₩';
  return `${sym} ${new Intl.NumberFormat('ko-KR').format(Math.round(n))}`;
}

function methodLabel(m: RecognitionMethod): { label: string; color: string } {
  switch (m) {
    case 'straight_line': return { label: '기간 균등 분배', color: 'bg-blue-100 text-blue-700' };
    case 'usage_based': return { label: '사용량 기준', color: 'bg-violet-100 text-violet-700' };
    case 'point_in_time': return { label: '일시 인식', color: 'bg-amber-100 text-amber-700' };
  }
}

function statusStyle(s: RecognitionEntry['status']) {
  switch (s) {
    case 'closed': return { label: '마감', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: Lock };
    case 'pending': return { label: '인식예정 (이번달)', bg: 'bg-blue-50', text: 'text-blue-700', icon: FileText };
    case 'projected': return { label: '예측', bg: 'bg-zinc-50', text: 'text-zinc-500', icon: BookOpen };
  }
}

function calcStats(c: ContractRevenue) {
  const recognized = c.schedule.filter((e) => e.status === 'closed').reduce((s, e) => s + e.amount, 0);
  const pending = c.schedule.filter((e) => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
  const projected = c.schedule.filter((e) => e.status === 'projected').reduce((s, e) => s + e.amount, 0);
  // 선수금 부채 = 받은 금액(=계약금액) − 인식된 매출 (기간/일시 한정)
  const deferredRevenue = c.method === 'usage_based' ? 0 : c.contractAmount - recognized;
  return { recognized, pending, projected, deferredRevenue };
}

// ─── 계약 카드 ────────────────────────────────────────

function ContractCard({ c }: { c: ContractRevenue }) {
  const stats = calcStats(c);
  const m = methodLabel(c.method);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{c.name}</h3>
          <p className="text-xs text-zinc-400">{c.client} · {c.startDate} ~ {c.endDate ?? '무기한'}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${m.color}`}>{m.label}</span>
      </div>

      {/* 인식 매출 / 선수금 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-[10px] text-emerald-600">인식 매출 (마감)</p>
          <p className="mt-0.5 text-base font-bold text-emerald-700">{formatAmount(stats.recognized, c.currency)}</p>
        </div>
        <div className="rounded-lg bg-blue-50 p-3">
          <p className="text-[10px] text-blue-600">이번달 인식예정</p>
          <p className="mt-0.5 text-base font-bold text-blue-700">{formatAmount(stats.pending, c.currency)}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-[10px] text-amber-600">선수금 잔액 (부채)</p>
          <p className="mt-0.5 text-base font-bold text-amber-700">{formatAmount(stats.deferredRevenue, c.currency)}</p>
        </div>
      </div>

      {/* 진행률 (계약금액 기준) */}
      {c.contractAmount > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">매출 인식 진척</span>
            <span className="font-semibold text-zinc-700">
              {formatAmount(stats.recognized, c.currency)} / {formatAmount(c.contractAmount, c.currency)} ({((stats.recognized / c.contractAmount) * 100).toFixed(1)}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full bg-emerald-500" style={{ width: `${(stats.recognized / c.contractAmount) * 100}%` }} />
          </div>
        </div>
      )}

      {/* 월별 인식 스케줄 (테이블) */}
      <div className="border-t pt-3">
        <p className="mb-2 text-[11px] font-semibold text-zinc-500">월별 인식 스케줄</p>
        <div className="grid grid-cols-6 gap-1">
          {c.schedule.map((e) => {
            const ss = statusStyle(e.status);
            const Icon = ss.icon;
            return (
              <div key={e.month} className={`rounded-md ${ss.bg} p-1.5 text-center`}>
                <p className="text-[9px] text-zinc-500">{e.month.slice(5)}</p>
                <p className={`text-[10px] font-semibold ${ss.text}`}>{formatAmount(e.amount, c.currency).replace('  ', ' ')}</p>
                <Icon className={`mx-auto mt-0.5 h-2.5 w-2.5 ${ss.text}`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── 월별 인식 매출 통합 차트 (USD) ─────────────────────

function MonthlyRecognitionChart() {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
  const data = months.map((m) => {
    let closed = 0;
    let pending = 0;
    let projected = 0;
    SAMPLE.forEach((c) => {
      if (c.currency !== 'USD') return;
      c.schedule.filter((e) => e.month === m).forEach((e) => {
        if (e.status === 'closed') closed += e.amount;
        else if (e.status === 'pending') pending += e.amount;
        else projected += e.amount;
      });
    });
    return { month: m.slice(5), 마감: Math.round(closed), 인식예정: Math.round(pending), 예측: Math.round(projected) };
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-zinc-900">월별 매출 인식 스케줄 (USD)</h3>
        <span className="text-xs text-zinc-400">기간형 계약 합산</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="마감" stackId="a" fill="#10b981" />
          <Bar dataKey="인식예정" stackId="a" fill="#3b82f6" />
          <Bar dataKey="예측" stackId="a" fill="#d4d4d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 누적 인식 vs 선수금 부채 ──────────────────────────

function CumulativeChart() {
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
  let cumRecognized = 0;
  const totalContract = SAMPLE.filter((c) => c.currency === 'USD' && c.method !== 'usage_based').reduce((s, c) => s + c.contractAmount, 0);

  const data = months.map((m) => {
    SAMPLE.forEach((c) => {
      if (c.currency !== 'USD') return;
      if (c.method === 'usage_based') return;
      c.schedule.filter((e) => e.month === m && (e.status === 'closed' || e.status === 'pending')).forEach((e) => {
        cumRecognized += e.amount;
      });
    });
    return {
      month: m.slice(5),
      누적인식매출: Math.round(cumRecognized),
      선수금부채: Math.round(Math.max(totalContract - cumRecognized, 0)),
    };
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-zinc-900">누적 인식 매출 vs 선수금 부채 (USD)</h3>
        <span className="text-xs text-zinc-400">기간 + 일시 인식 합산</span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area type="monotone" dataKey="누적인식매출" fill="#10b981" stroke="#10b981" fillOpacity={0.3} />
          <Line type="monotone" dataKey="선수금부채" stroke="#f59e0b" strokeWidth={2} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────

export default function DepositAccountingPage() {
  const [filter, setFilter] = useState<'all' | RecognitionMethod>('all');
  const filtered = SAMPLE.filter((c) => filter === 'all' || c.method === filter);

  // 글로벌 KPI (USD만 단순화)
  const usd = SAMPLE.filter((c) => c.currency === 'USD');
  const totalContract = usd.reduce((s, c) => s + c.contractAmount, 0);
  const totalRecognized = usd.reduce((s, c) => s + calcStats(c).recognized, 0);
  const totalPending = usd.reduce((s, c) => s + calcStats(c).pending, 0);
  const totalDeferred = usd.reduce((s, c) => s + calcStats(c).deferredRevenue, 0);

  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">B안 · 회계 관점</span>
            <a href="/test-ui-preview/deposit" className="text-xs text-zinc-400 hover:text-zinc-600">← 인덱스로</a>
            <a href="/test-ui-preview/deposit/operation" className="text-xs text-zinc-400 hover:text-zinc-600">← A안 운영 보기</a>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">예치금 대시보드 · 회계 인식 관점</h1>
          <p className="mt-1 text-sm text-zinc-500">
            재무·CFO용. K-IFRS 1115 기반 월별 매출 인식 스케줄과 선수금 부채 잔액을 추적한다.
          </p>
        </div>

        {/* 글로벌 KPI */}
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <p className="text-xs text-zinc-400">총 계약 금액 (USD)</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900">{formatAmount(totalContract, 'USD')}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />누적 인식 매출</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{formatAmount(totalRecognized, 'USD')}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs text-blue-600">이번달 인식예정</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{formatAmount(totalPending, 'USD')}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-xs text-amber-600">선수금 부채 잔액</p>
            <p className="mt-1 text-2xl font-bold text-amber-700">{formatAmount(totalDeferred, 'USD')}</p>
          </div>
        </div>

        {/* 차트 영역 */}
        <div className="grid grid-cols-2 gap-4">
          <MonthlyRecognitionChart />
          <CumulativeChart />
        </div>

        {/* 필터 */}
        <div className="flex items-center gap-2">
          <button onClick={() => setFilter('all')} className={`h-8 rounded-lg px-3 text-[13px] font-medium ${filter === 'all' ? 'bg-zinc-900 text-white' : 'bg-white border text-zinc-500'}`}>
            전체 ({SAMPLE.length})
          </button>
          <button onClick={() => setFilter('straight_line')} className={`h-8 rounded-lg px-3 text-[13px] font-medium ${filter === 'straight_line' ? 'bg-blue-600 text-white' : 'bg-white border text-zinc-500'}`}>
            기간 균등
          </button>
          <button onClick={() => setFilter('usage_based')} className={`h-8 rounded-lg px-3 text-[13px] font-medium ${filter === 'usage_based' ? 'bg-violet-600 text-white' : 'bg-white border text-zinc-500'}`}>
            사용량 기준
          </button>
          <button onClick={() => setFilter('point_in_time')} className={`h-8 rounded-lg px-3 text-[13px] font-medium ${filter === 'point_in_time' ? 'bg-amber-600 text-white' : 'bg-white border text-zinc-500'}`}>
            일시 인식
          </button>
        </div>

        {/* 카드 그리드 */}
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((c) => <ContractCard key={c.id} c={c} />)}
        </div>

        {/* 모델 설명 */}
        <div className="rounded-xl border bg-white p-5 space-y-2">
          <h3 className="font-semibold text-zinc-900">B안 (회계) 데이터 모델</h3>
          <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600">
            <li><code>revenue_recognition_schedules</code> — 계약별 월별 인식 매출 스케줄</li>
            <li>인식 방식: <code>straight_line</code> (기간 균등) / <code>usage_based</code> (사용량) / <code>point_in_time</code> (일시)</li>
            <li>상태: <code>closed</code> (결산 마감) / <code>pending</code> (이번 달) / <code>projected</code> (예측)</li>
            <li>선수금(부채) = 수령액 − 인식 매출 (기간/일시형만)</li>
            <li>K-IFRS 1115 적용 — 분기/연 결산 시 ERP로 export</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

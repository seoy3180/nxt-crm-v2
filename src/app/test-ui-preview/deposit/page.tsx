'use client';

/**
 * 예치금 대시보드 — 인덱스 (두 모델 비교)
 *
 * MSP CRM에서 "예치금"이 의미하는 두 가지 관점:
 *  A 운영 관점 → 잔액/소진 트래킹 (영업·고객 케어)
 *  B 회계 관점 → 매출 인식/선수금 부채 (재무·CFO)
 *
 * 동식님께 어느 모델이 맞는지 확인 후 메인 코드 반영.
 */

import Link from 'next/link';
import { Wallet, BookOpen, ArrowRight, Users, Calculator, Bell, FileSpreadsheet } from 'lucide-react';

const COMPARE = [
  {
    key: 'audience',
    label: '사용자',
    a: { icon: Users, text: '영업, 고객 케어, 운영팀' },
    b: { icon: Calculator, text: '재무팀, CFO, 결산담당' },
  },
  {
    key: 'metric',
    label: '메인 숫자',
    a: { icon: Wallet, text: '현재 잔액 (예치금 통장)' },
    b: { icon: BookOpen, text: '월별 인식 매출 / 선수금 부채' },
  },
  {
    key: 'data',
    label: '핵심 데이터',
    a: { icon: Wallet, text: '예치(+)/차감(−) 트랜잭션 로그' },
    b: { icon: BookOpen, text: '월별 매출 인식 스케줄' },
  },
  {
    key: 'alert',
    label: '주요 알림',
    a: { icon: Bell, text: '잔액 < 임계% → 충전 영업 트리거' },
    b: { icon: FileSpreadsheet, text: '결산 마감, ERP export' },
  },
  {
    key: 'standard',
    label: '회계 기준',
    a: { icon: Wallet, text: '실시간 cash 잔액 (현금흐름)' },
    b: { icon: BookOpen, text: 'K-IFRS 1115 수익인식' },
  },
  {
    key: 'data_source',
    label: '차감/인식 데이터 출처',
    a: { icon: Wallet, text: 'AWS Cost Explorer 자동 / 빌링온 수기' },
    b: { icon: BookOpen, text: '계약 시작일 + 인식 방식으로 자동 계산' },
  },
];

export default function DepositIndexPage() {
  return (
    <div className="p-8 bg-zinc-50 min-h-screen">
      <div className="mx-auto max-w-6xl space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-zinc-900">예치금 대시보드 — 두 가지 해석</h1>
          <p className="mt-2 text-sm text-zinc-500">
            MSP CRM에서 "예치금"은 관점에 따라 다르게 해석됩니다. 동식님 요구사항을 명확히 하기 위해
            두 모델을 모두 프로토타입으로 만들어 비교합니다.
          </p>
        </header>

        {/* 두 카드 */}
        <div className="grid grid-cols-2 gap-6">
          {/* A 안 */}
          <Link
            href="/test-ui-preview/deposit/operation"
            className="group rounded-2xl border-2 border-blue-200 bg-white p-6 hover:border-blue-400 hover:shadow-lg transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">A 안</p>
                <h2 className="text-lg font-bold text-zinc-900">운영 관점</h2>
              </div>
            </div>
            <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
              고객이 미리 예치한 금액을 통장처럼 관리. AWS 사용량이 발생하면 잔액에서 차감되고,
              잔액이 줄면 추가 충전 영업 알림이 발동.
            </p>
            <div className="mt-4 space-y-1.5 text-xs text-zinc-500">
              <p>• 현재 잔액, 월평균 소진율, 소진 예상일</p>
              <p>• 입출 트랜잭션 로그</p>
              <p>• 임계 알림 (잔액 부족, 충전 영업)</p>
            </div>
            <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
              운영 대시보드 보기 <ArrowRight className="h-4 w-4" />
            </div>
          </Link>

          {/* B 안 */}
          <Link
            href="/test-ui-preview/deposit/accounting"
            className="group rounded-2xl border-2 border-emerald-200 bg-white p-6 hover:border-emerald-400 hover:shadow-lg transition"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">B 안</p>
                <h2 className="text-lg font-bold text-zinc-900">회계 인식 관점</h2>
              </div>
            </div>
            <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
              받은 예치금은 회계상 선수금(부채). 매월 사용/경과만큼 매출로 인식되고,
              미인식 잔액은 부채로 남음. 결산·재무 보고용.
            </p>
            <div className="mt-4 space-y-1.5 text-xs text-zinc-500">
              <p>• 월별 매출 인식 스케줄 (마감/예정/예측)</p>
              <p>• 선수금 부채 잔액 (B/S 부채 항목)</p>
              <p>• K-IFRS 1115 수익인식 기준</p>
            </div>
            <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform">
              회계 대시보드 보기 <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        </div>

        {/* 비교표 */}
        <section className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <div className="border-b bg-zinc-50 px-6 py-3">
            <h3 className="text-sm font-semibold text-zinc-700">두 모델 한눈에 비교</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-white">
              <tr className="border-b border-zinc-100">
                <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-400 w-1/5">구분</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-blue-600 w-2/5">A · 운영</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-emerald-600 w-2/5">B · 회계</th>
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((row) => {
                const Aicon = row.a.icon;
                const Bicon = row.b.icon;
                return (
                  <tr key={row.key} className="border-b border-zinc-100 last:border-0">
                    <td className="px-6 py-3 font-medium text-zinc-700">{row.label}</td>
                    <td className="px-6 py-3 text-zinc-600">
                      <div className="flex items-start gap-2">
                        <Aicon className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                        <span>{row.a.text}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-zinc-600">
                      <div className="flex items-start gap-2">
                        <Bicon className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                        <span>{row.b.text}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* 데이터 모델 차이 */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-zinc-700 mb-4">데이터 구조의 차이</h3>
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <p className="font-semibold text-blue-600 mb-2">A 운영 — 트랜잭션 모델</p>
              <pre className="bg-zinc-50 p-3 rounded-lg text-[11px] text-zinc-700 overflow-x-auto">{`deposit_accounts
  ├─ contract_id
  ├─ currency
  └─ payer_account_id

deposit_transactions
  ├─ account_id
  ├─ date
  ├─ type    -- deposit | usage
  ├─ amount  -- + / −
  └─ memo

balance = SUM(amount)`}</pre>
            </div>
            <div>
              <p className="font-semibold text-emerald-600 mb-2">B 회계 — 인식 스케줄 모델</p>
              <pre className="bg-zinc-50 p-3 rounded-lg text-[11px] text-zinc-700 overflow-x-auto">{`revenue_recognition_schedules
  ├─ contract_id
  ├─ month       -- YYYY-MM
  ├─ amount      -- 인식할 금액
  ├─ method      -- straight_line
  │             -- usage_based
  │             -- point_in_time
  └─ status      -- closed | pending
                -- projected

deferred_revenue = paid − closed_recognized`}</pre>
            </div>
          </div>
        </section>

        {/* 같이 운영할 수도 있음 */}
        <section className="rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50 p-6">
          <h3 className="text-sm font-semibold text-amber-800">참고: 둘 다 필요할 수도 있음</h3>
          <p className="mt-2 text-sm text-amber-700 leading-relaxed">
            대형 MSP들은 보통 두 모델을 <strong>모두 운영</strong>합니다.
            영업/고객 케어는 A를 보고, 재무는 B를 봅니다. 두 모델은 데이터 소스는 다르지만
            계약(contract)을 중심으로 join 가능합니다.
            동식님이 말한 "예치금 대시보드"가 둘 중 하나만이라면 우선순위를, 둘 다라면 어느 쪽을 먼저 만들지 결정 필요.
          </p>
        </section>
      </div>
    </div>
  );
}

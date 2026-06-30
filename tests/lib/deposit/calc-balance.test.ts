import { describe, it, expect } from 'vitest';
import {
  calcAvgMonthlyUsage,
  calcDaysUntilDepleted,
  calcBalancePct,
  calcAlertLevel,
} from '@/lib/deposit/calc-balance';
import type { DepositAccount, DepositTransaction } from '@/lib/deposit/types';

const account = (over: Partial<DepositAccount> = {}): DepositAccount => ({
  id: 'a',
  contract_id: 'c',
  balance: 0,
  total_deposit: 0,
  total_usage: 0,
  last_recalc_at: null,
  start_date: null,
  end_date: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  ...over,
});

const txn = (over: Partial<DepositTransaction> = {}): DepositTransaction => ({
  id: 't',
  account_id: 'a',
  txn_date: '2026-01-31',
  txn_type: 'usage',
  amount: 100,
  memo: null,
  source: 'manual',
  created_by: null,
  created_at: '2026-01-31T00:00:00Z',
  voided_at: null,
  voided_by: null,
  void_reason: null,
  ...over,
});

describe('calcAvgMonthlyUsage (직전 N개월 평균, 활성 기간 적응)', () => {
  it('활성 5개월 / 직전 3개월(2026-03~05) usage 900,000 → 300,000', () => {
    const acct = account({ created_at: '2026-01-01T00:00:00Z', total_usage: 5_500_000 });
    const txns = [
      txn({ txn_date: '2026-01-31', amount: 1_200_000 }),
      txn({ txn_date: '2026-02-28', amount: 1_300_000 }),
      txn({ txn_date: '2026-03-31', amount: 200_000 }),
      txn({ txn_date: '2026-04-30', amount: 300_000 }),
      txn({ txn_date: '2026-05-31', amount: 400_000 }),
    ];
    const now = new Date('2026-05-31T12:00:00Z');
    expect(calcAvgMonthlyUsage(acct, txns, now)).toBe(300_000);
  });

  it('활성 1개월 / N = min(3, 1) = 1', () => {
    const acct = account({ created_at: '2026-05-01T00:00:00Z', total_usage: 800_000 });
    const txns = [txn({ txn_date: '2026-05-15', amount: 800_000 })];
    const now = new Date('2026-05-31T12:00:00Z');
    expect(calcAvgMonthlyUsage(acct, txns, now)).toBe(800_000);
  });

  it('usage 트랜잭션이 0건이면 0 반환', () => {
    const acct = account({ total_usage: 0 });
    expect(calcAvgMonthlyUsage(acct, [], new Date())).toBe(0);
  });

  it('voided usage 트랜잭션은 평균 계산에서 제외', () => {
    const acct = account({ created_at: '2026-03-01T00:00:00Z' });
    const txns = [
      txn({ txn_date: '2026-05-15', amount: 300_000 }),
      txn({ txn_date: '2026-05-20', amount: 100_000, voided_at: '2026-05-21T00:00:00Z' }),
    ];
    const now = new Date('2026-05-31T12:00:00Z');
    // 유효 usage는 5/15 1건(300k)뿐 — voided(5/20)는 제외. 첫 사용=5월 → N=1 → 300,000/월
    expect(calcAvgMonthlyUsage(acct, txns, now)).toBe(300_000);
  });

  it('계좌는 최근 생성·사용은 과거부터 → 첫 사용일 기준으로 과거분 반영 (소급 활성화 패턴)', () => {
    // 예치금 계좌를 5/20에 뒤늦게 활성화(소급)했지만 usage는 3월부터 있음.
    const acct = account({ created_at: '2026-05-20T00:00:00Z' });
    const txns = [
      txn({ txn_date: '2026-03-15', amount: 600_000 }),
      txn({ txn_date: '2026-04-15', amount: 600_000 }),
    ];
    const now = new Date('2026-05-31T12:00:00Z');
    // 첫 사용=3/15 → 활성개월 3 → N=3, cutoff≈3/3 → 3·4월 포함, 1.2M/3 = 400,000
    // (계좌 생성일 5/20 기준이었다면 N=1·cutoff=4/30 → 둘 다 잘려 0이 됐을 케이스)
    expect(calcAvgMonthlyUsage(acct, txns, now)).toBe(400_000);
  });
});

describe('calcDaysUntilDepleted', () => {
  it('balance 1,500,000 / avg 300,000 → 150일', () => {
    expect(calcDaysUntilDepleted(1_500_000, 300_000)).toBe(150);
  });

  it('avgMonthlyUsage 0 → Infinity', () => {
    expect(calcDaysUntilDepleted(1_000_000, 0)).toBe(Infinity);
  });

  it('balance 음수 → 0 미만이지만 그대로 반환', () => {
    expect(calcDaysUntilDepleted(-30_000, 300_000)).toBe(-3);
  });
});

describe('calcBalancePct', () => {
  it('balance 250_000 / total_deposit 1_000_000 → 25', () => {
    const acct = account({ balance: 250_000, total_deposit: 1_000_000 });
    expect(calcBalancePct(acct)).toBe(25);
  });

  it('total_deposit 0 → 0 (분모 0 방어)', () => {
    const acct = account({ balance: 100, total_deposit: 0 });
    expect(calcBalancePct(acct)).toBe(0);
  });
});

describe('calcAlertLevel — 배수 경계 (잔액% 안전망 밖: total_deposit=balance라 잔액%≈100%)', () => {
  // 월평균 100,000 기준 (긴급 임계 200k, 주의 임계 300k). 잔액%를 100%로 둬 안전망 무력화.
  const acct = (balance: number) =>
    account({ balance, total_deposit: balance, total_usage: 1 });

  it('잔액 = 월평균 × 2 (정확히 200k) → critical (경계 포함)', () => {
    expect(calcAlertLevel(acct(200_000), 100_000)).toBe('critical');
  });

  it('잔액 = 월평균 × 2 + 1 (200,001) → warning (긴급 경계 초과)', () => {
    expect(calcAlertLevel(acct(200_001), 100_000)).toBe('warning');
  });

  it('잔액 = 월평균 × 3 (정확히 300k) → warning (경계 포함)', () => {
    expect(calcAlertLevel(acct(300_000), 100_000)).toBe('warning');
  });

  it('잔액 = 월평균 × 3 + 1 (300,001) → ok (주의 경계 초과)', () => {
    expect(calcAlertLevel(acct(300_001), 100_000)).toBe('ok');
  });

  it('충분한 잔액 (월평균의 10배) → ok', () => {
    expect(calcAlertLevel(acct(1_000_000), 100_000)).toBe('ok');
  });
});

describe('calcAlertLevel — 잔액% 안전망 (긴급만, < 10%)', () => {
  it('사용 멈춤(avg=0) + 잔액% 2.6% → critical (배수론 정상이지만 바닥 포착, 동국대_안효진 케이스)', () => {
    const acct = account({ balance: 35_470, total_deposit: 1_380_000, total_usage: 1_344_530 });
    expect(calcAlertLevel(acct, 0)).toBe('critical');
  });

  it('사용 멈춤(avg=0) + 잔액% 100% → ok (충분히 남음)', () => {
    const acct = account({ balance: 5_000_000, total_deposit: 5_000_000, total_usage: 0 });
    expect(calcAlertLevel(acct, 0)).toBe('ok');
  });

  it('잔액% 정확히 10% (경계 미포함, < 10 strict) → 배수 판정으로 (avg=0이면 ok)', () => {
    // balance 1M / deposit 10M = 10%. 10 < 10 거짓 → 잔액% 안전망 미발동. avg=0·잔액>0 → ok
    const acct = account({ balance: 1_000_000, total_deposit: 10_000_000, total_usage: 1 });
    expect(calcAlertLevel(acct, 0)).toBe('ok');
  });

  it('잔액% 9.9% → critical (안전망 발동)', () => {
    const acct = account({ balance: 990_000, total_deposit: 10_000_000, total_usage: 1 });
    expect(calcAlertLevel(acct, 0)).toBe('critical');
  });
});

describe('calcAlertLevel — 공통 엣지', () => {
  it('잔액 음수 → critical', () => {
    const acct = account({ balance: -20_000, total_deposit: 3_000_000, total_usage: 100 });
    expect(calcAlertLevel(acct, 1_000)).toBe('critical');
  });

  it('활성화 직후 (total_deposit=0 AND total_usage=0) → ok', () => {
    const fresh = account({ balance: 0, total_deposit: 0, total_usage: 0 });
    expect(calcAlertLevel(fresh, 0)).toBe('ok');
  });

  it('정상 운영 중 전액 소진 (잔액 0, avg>0) → critical', () => {
    const depleted = account({ balance: 0, total_deposit: 1_000_000, total_usage: 1_000_000 });
    expect(calcAlertLevel(depleted, 300_000)).toBe('critical');
  });
});

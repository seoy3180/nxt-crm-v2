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
    // 활성 3개월, voided 제외하면 직전 3개월 합 300_000 → 100_000/월
    expect(calcAvgMonthlyUsage(acct, txns, now)).toBe(100_000);
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

describe('calcAlertLevel', () => {
  it('balancePct = 10% 경계는 warning (조건: < 10 strict)', () => {
    const acct = account({ balance: 1_000_000, total_deposit: 10_000_000 });
    expect(calcAlertLevel(acct, 0)).toBe('warning');
  });

  it('daysUntilDepleted = 5 → critical (< 14)', () => {
    const acct = account({ balance: 50_000, total_deposit: 1_000_000 });
    // avg 300_000 → 50_000 / 300_000 * 30 = 5일
    expect(calcAlertLevel(acct, 300_000)).toBe('critical');
  });

  it('잔액 음수 → critical', () => {
    const acct = account({ balance: -20, total_deposit: 3_000_000 });
    expect(calcAlertLevel(acct, 1_000)).toBe('critical');
  });

  it('충분한 잔액 + 사용량 적음 → ok', () => {
    const acct = account({ balance: 8_000_000, total_deposit: 10_000_000 });
    expect(calcAlertLevel(acct, 100_000)).toBe('ok');
  });

  it('활성화 직후 (total_deposit=0 AND total_usage=0) → ok', () => {
    // 새 계좌 활성화 후 입금/사용 모두 없는 운영 시작 전 상태는 alert 제외.
    const acct = account({ balance: 0, total_deposit: 0, total_usage: 0 });
    expect(calcAlertLevel(acct, 0)).toBe('ok');
  });

  it('total_deposit > 0인데 잔액 0 (전액 소진) → critical', () => {
    // fresh 분기로 인해 정상 운영 중 전액 소진이 가려지지 않는지 검증.
    const acct = account({ balance: 0, total_deposit: 1_000_000, total_usage: 1_000_000 });
    expect(calcAlertLevel(acct, 300_000)).toBe('critical');
  });
});

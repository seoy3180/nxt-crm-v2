import { AVG_MONTHS_WINDOW, DEPOSIT_ALERT_THRESHOLDS } from './constants';
import type { AlertLevel, DepositAccount, DepositTransaction } from './types';

/**
 * 두 날짜 사이의 개월 차이 (월 경계 포함). created_at으로부터 활성 개월수 계산용.
 * 예: 2026-01-15 → 2026-05-31 = 5개월.
 */
function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth()) +
    1
  );
}

/**
 * 직전 N개월 평균 월 사용량.
 * N = min(AVG_MONTHS_WINDOW, 활성 개월수). 활성 기간이 짧으면 분모 자동 조정.
 * voided 트랜잭션은 제외.
 */
export function calcAvgMonthlyUsage(
  account: DepositAccount,
  transactions: DepositTransaction[],
  now: Date = new Date(),
): number {
  const usageTxns = transactions.filter(
    (t) => t.txn_type === 'usage' && !t.voided_at,
  );
  if (usageTxns.length === 0) return 0;

  const activeMonths = Math.max(1, monthsBetween(new Date(account.created_at), now));
  const N = Math.min(AVG_MONTHS_WINDOW, activeMonths);

  // 직전 N개월의 시작일 (N개월 전 같은 일자)
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - N);

  const recentSum = usageTxns
    .filter((t) => new Date(t.txn_date) >= cutoff)
    .reduce((s, t) => s + t.amount, 0);

  return Math.round(recentSum / N);
}

/** 현재 잔액으로 며칠 더 버틸 수 있는지. */
export function calcDaysUntilDepleted(balance: number, avgMonthlyUsage: number): number {
  if (avgMonthlyUsage <= 0) return Infinity;
  return Math.round((balance / avgMonthlyUsage) * 30);
}

/** 예치액 대비 잔액 비율(%). total_deposit 0이면 0 반환. */
export function calcBalancePct(account: DepositAccount): number {
  if (account.total_deposit <= 0) return 0;
  return (account.balance / account.total_deposit) * 100;
}

/**
 * 알림 레벨 판정.
 * - critical: balancePct < 10 OR daysUntilDepleted < 14 (strict <)
 * - warning: balancePct < 25 OR daysUntilDepleted < 45
 * - ok: 그 외
 * 분모 0(total_deposit 0)인 경우 balancePct는 0이 되어 critical 분류됨.
 */
export function calcAlertLevel(account: DepositAccount, avgMonthlyUsage: number): AlertLevel {
  const pct = calcBalancePct(account);
  const days = calcDaysUntilDepleted(account.balance, avgMonthlyUsage);

  if (
    pct < DEPOSIT_ALERT_THRESHOLDS.critical.balancePct ||
    days < DEPOSIT_ALERT_THRESHOLDS.critical.days
  ) {
    return 'critical';
  }
  if (
    pct < DEPOSIT_ALERT_THRESHOLDS.warning.balancePct ||
    days < DEPOSIT_ALERT_THRESHOLDS.warning.days
  ) {
    return 'warning';
  }
  return 'ok';
}

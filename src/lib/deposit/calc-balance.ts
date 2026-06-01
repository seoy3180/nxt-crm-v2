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
 *
 * 활성 개월수 기준 = "가장 오래된 usage 거래일"(account.created_at 아님).
 *   예치금 계좌를 뒤늦게 활성화하고 과거 사용분을 소급 입력하는 운영 패턴에서,
 *   계좌 생성일 기준이면 활성개월=1로 과소평가돼 과거 사용분이 평균에서 누락된다.
 *   실제 첫 사용일 기준으로 잡아야 소급 데이터까지 평균에 반영된다.
 */
export function calcAvgMonthlyUsage(
  _account: DepositAccount,
  transactions: DepositTransaction[],
  now: Date = new Date(),
): number {
  const usageTxns = transactions.filter(
    (t) => t.txn_type === 'usage' && !t.voided_at,
  );
  if (usageTxns.length === 0) return 0;

  const oldestUsageDate = new Date(
    Math.min(...usageTxns.map((t) => new Date(t.txn_date).getTime())),
  );

  const activeMonths = Math.max(1, monthsBetween(oldestUsageDate, now));
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
 * 알림 레벨 판정 — 소진 속도(월평균 배수) + 절대 바닥(잔액%) 하이브리드.
 * - 활성화 직후(total_deposit=0 AND total_usage=0): 운영 시작 전이므로 ok
 * - critical: 잔액 ≤ 월평균 × 2 (≈ 잔여 2개월 이하)  OR  잔액% < 10%
 * - warning : 잔액 ≤ 월평균 × 3 (≈ 잔여 3개월 이하, 긴급 아닌 것)
 * - ok      : 그 외
 *
 * 배수 경계 포함(≤): 잔액이 정확히 2배면 critical, 3배면 warning.
 * 잔액% 안전망(critical만): 사용이 멈춰 월평균=0이어도(배수론 정상) 예치액 대비 거의
 *   소진된 계좌(잔액% < 10%)는 critical로 포착. warning엔 미적용(runway 충분한 계좌 과경보 방지).
 * 사용 이력 없는 계좌(avgMonthlyUsage=0): 배수 임계값 0 → 잔액>0이면 배수상 ok이나,
 *   잔액%가 10% 미만이면 critical.
 */
export function calcAlertLevel(account: DepositAccount, avgMonthlyUsage: number): AlertLevel {
  if (account.total_deposit === 0 && account.total_usage === 0) {
    return 'ok';
  }

  const criticalThreshold = avgMonthlyUsage * DEPOSIT_ALERT_THRESHOLDS.critical.usageMultiple;
  const warningThreshold = avgMonthlyUsage * DEPOSIT_ALERT_THRESHOLDS.warning.usageMultiple;
  const pct = calcBalancePct(account);

  if (
    account.balance <= criticalThreshold ||
    pct < DEPOSIT_ALERT_THRESHOLDS.critical.balancePct
  ) {
    return 'critical';
  }
  if (account.balance <= warningThreshold) {
    return 'warning';
  }
  return 'ok';
}

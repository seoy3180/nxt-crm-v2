/**
 * 예치금 알림 임계값 (MVP는 코드 상수, 계좌별 설정 X)
 *
 * 두 위험을 함께 본다:
 *  - 소진 속도: 잔액이 "직전 3개월 월평균 사용액(calcAvgMonthlyUsage)"의 몇 배 이하인가
 *  - 절대 바닥: 예치액 대비 잔액 비율(잔액%) — 사용이 멈춘 채 거의 소진된 계좌 포착
 *
 * - critical: 잔액 ≤ 월평균 × 2 (≈ 잔여 2개월 이하)  OR  잔액% < 10%
 * - warning : 잔액 ≤ 월평균 × 3 (≈ 잔여 3개월 이하, 긴급 아닌 것)
 * - ok      : 그 외
 *
 * 잔액% 안전망은 critical에만 적용 (warning에 넣으면 runway 충분한 계좌가 과경보).
 */
export const DEPOSIT_ALERT_THRESHOLDS = {
  critical: { usageMultiple: 2, balancePct: 10 },
  warning: { usageMultiple: 3 },
} as const;

/**
 * 평균 월 사용량 계산 시 사용할 최대 윈도우 (PRD 1-2A 결정: 직전 3개월)
 * 활성 개월수가 짧으면 활성 개월수로 자동 조정.
 */
export const AVG_MONTHS_WINDOW = 3;

/**
 * 거래 유형 표시 라벨
 */
export const TXN_TYPE_LABELS = {
  deposit: '예치',
  usage: '사용',
  adjustment: '조정',
  refund: '환불',
} as const;

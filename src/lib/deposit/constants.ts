/**
 * 예치금 알림 임계값 (PRD Q4 결정: MVP는 코드 상수, 계좌별 설정 X)
 */
export const DEPOSIT_ALERT_THRESHOLDS = {
  critical: { balancePct: 10, days: 14 },
  warning: { balancePct: 25, days: 45 },
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

-- 예치금 테스트 정리 (rollback)
-- 사용 시점: 시드 + 수동 테스트 + Playwright E2E 종료 후
-- 안전 가정: deposit_accounts/transactions는 신규 테이블이라 운영 데이터 0건.
--           따라서 truncate가 안전. contracts.deleted_at 복구는 별도 처리.

-- 1) deposit 도메인 전체 초기화
TRUNCATE deposit_transactions, deposit_accounts CASCADE;

-- 2) 검증 — 모두 0건이어야 함
SELECT
  (SELECT COUNT(*) FROM deposit_accounts) AS accounts,
  (SELECT COUNT(*) FROM deposit_transactions) AS transactions;

-- 3) (선택) Playwright 계약 삭제 시나리오로 변경된 contracts.deleted_at 복구
-- spec 안에서 cleanup하면 본 라인은 불필요. 비상시 사용:
-- UPDATE contracts SET deleted_at = NULL WHERE id = '<시나리오에서_삭제된_계약_id>';

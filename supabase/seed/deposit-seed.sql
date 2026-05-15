-- 예치금 대시보드 시드 데이터 (dev 환경 전용)
-- 관련 Plan: docs/superpowers/plans/2026-05-15-deposit-dashboard.md Task 5
-- 시나리오 3종: critical / warning / ok
--
-- 사용법:
--   psql ... -f supabase/seed/deposit-seed.sql
-- 또는 Supabase Dashboard SQL Editor에서 실행
--
-- ⚠️ 운영 환경 실행 금지. dev seed 후에만 실행.

DO $$
DECLARE
  contract_critical uuid;
  contract_warning  uuid;
  contract_ok       uuid;
  acct_id           uuid;
BEGIN
  -- 활성 MSP 계약 3건 확보 (이미 시드된 contracts 기준)
  SELECT id INTO contract_critical
    FROM contracts
   WHERE type = 'msp'::contract_type AND deleted_at IS NULL
   ORDER BY created_at LIMIT 1;

  SELECT id INTO contract_warning
    FROM contracts
   WHERE type = 'msp'::contract_type AND deleted_at IS NULL
     AND id <> contract_critical
   ORDER BY created_at OFFSET 1 LIMIT 1;

  SELECT id INTO contract_ok
    FROM contracts
   WHERE type = 'msp'::contract_type AND deleted_at IS NULL
     AND id <> contract_critical AND id <> contract_warning
   ORDER BY created_at OFFSET 2 LIMIT 1;

  IF contract_critical IS NULL OR contract_warning IS NULL OR contract_ok IS NULL THEN
    RAISE EXCEPTION 'MSP 계약이 3건 이상 필요합니다. contracts 시드 먼저 실행하세요.';
  END IF;

  -- 시나리오 1: critical (잔액 음수)
  INSERT INTO deposit_accounts (contract_id) VALUES (contract_critical) RETURNING id INTO acct_id;
  INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, memo, source) VALUES
    (acct_id, '2026-02-01', 'deposit', 3000000, '3개월분 예치',     'manual'),
    (acct_id, '2026-02-28', 'usage',    890000, 'AWS 2월 사용분',  'manual'),
    (acct_id, '2026-03-31', 'usage',    950000, 'AWS 3월 사용분',  'manual'),
    (acct_id, '2026-04-30', 'usage',   1080000, 'AWS 4월 사용분',  'manual'),
    (acct_id, '2026-05-31', 'usage',    100000, 'AWS 5월 사용분(잔액 음수)', 'manual');

  -- 시나리오 2: warning (잔액 ~20%)
  INSERT INTO deposit_accounts (contract_id) VALUES (contract_warning) RETURNING id INTO acct_id;
  INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, memo, source) VALUES
    (acct_id, '2026-04-01', 'deposit', 5000000, '예치',           'manual'),
    (acct_id, '2026-04-30', 'usage',   2000000, 'AWS 4월 사용분', 'manual'),
    (acct_id, '2026-05-31', 'usage',   1900000, 'AWS 5월 사용분', 'manual');

  -- 시나리오 3: ok (잔액 충분)
  INSERT INTO deposit_accounts (contract_id) VALUES (contract_ok) RETURNING id INTO acct_id;
  INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, memo, source) VALUES
    (acct_id, '2026-01-05', 'deposit', 12000000, '연간 선결제',     'manual'),
    (acct_id, '2026-01-31', 'usage',     980000, 'AWS 1월 사용분', 'manual'),
    (acct_id, '2026-02-28', 'usage',    1050000, 'AWS 2월 사용분', 'manual'),
    (acct_id, '2026-03-31', 'usage',     920000, 'AWS 3월 사용분', 'manual'),
    (acct_id, '2026-04-30', 'usage',    1100000, 'AWS 4월 사용분', 'manual');

  RAISE NOTICE '시드 완료: critical=%, warning=%, ok=%', contract_critical, contract_warning, contract_ok;
END $$;

-- 검증: 트리거가 잔액을 정확히 계산했는지 확인
SELECT
  c.name AS contract_name,
  a.balance,
  a.total_deposit,
  a.total_usage,
  CASE
    WHEN a.total_deposit > 0 THEN ROUND((a.balance::numeric / a.total_deposit) * 100, 1)
    ELSE NULL
  END AS balance_pct
FROM deposit_accounts a
JOIN contracts c ON c.id = a.contract_id
WHERE a.deleted_at IS NULL
ORDER BY a.balance;

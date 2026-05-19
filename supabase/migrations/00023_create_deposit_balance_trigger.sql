-- NXT CRM v2: 예치금 잔액 자동 갱신 트리거
-- PRD 3-1A 결정: 타입별 SUM 집계 + balance는 4타입 합산
-- 관련: docs/prd/deposit-dashboard.md §12 (트리거 의사코드)
-- 관련: docs/superpowers/plans/2026-05-15-deposit-dashboard.md Task 2
-- 보안: SECURITY DEFINER + SET search_path = public (Pre-mortem T-5)

CREATE OR REPLACE FUNCTION public.recalc_deposit_account_balance()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_account_id  uuid;
  v_total_deposit    bigint;
  v_total_usage      bigint;
  v_total_adjustment bigint;
  v_total_refund     bigint;
BEGIN
  target_account_id := COALESCE(NEW.account_id, OLD.account_id);

  -- 타입별 SUM (voided 제외)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposit
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'deposit'::deposit_txn_type
     AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_usage
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'usage'::deposit_txn_type
     AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_adjustment
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'adjustment'::deposit_txn_type
     AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_refund
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'refund'::deposit_txn_type
     AND voided_at IS NULL;

  UPDATE deposit_accounts SET
    total_deposit  = v_total_deposit,
    total_usage    = v_total_usage,
    balance        = v_total_deposit - v_total_usage + v_total_adjustment - v_total_refund,
    last_recalc_at = now(),
    updated_at     = now()
   WHERE id = target_account_id;

  RETURN NULL;
END $$;

CREATE TRIGGER trg_deposit_txn_recalc
AFTER INSERT OR UPDATE OF amount, voided_at, txn_type OR DELETE
ON deposit_transactions
FOR EACH ROW EXECUTE FUNCTION public.recalc_deposit_account_balance();

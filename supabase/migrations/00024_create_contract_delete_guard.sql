-- NXT CRM v2: 계약 soft delete 시 예치금 잔액 != 0 차단 (BIZ-5)
-- 관련 PRD: docs/prd/deposit-dashboard.md §7.2 BIZ-5 + Part 4 T-2
-- 관련 Plan: docs/superpowers/plans/2026-05-15-deposit-dashboard.md Task 3

CREATE OR REPLACE FUNCTION public.guard_contract_delete_with_deposit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM deposit_accounts
       WHERE contract_id = NEW.id
         AND deleted_at IS NULL
         AND balance <> 0
    ) THEN
      RAISE EXCEPTION 'DEPOSIT_BALANCE_NOT_ZERO'
        USING HINT = '예치금 잔액이 남아있어 계약을 종료할 수 없습니다. 환불(refund) 후 다시 시도하세요.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_contract_delete_guard
BEFORE UPDATE OF deleted_at ON contracts
FOR EACH ROW EXECUTE FUNCTION public.guard_contract_delete_with_deposit();

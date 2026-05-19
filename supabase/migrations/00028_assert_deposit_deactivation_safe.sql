-- 00028: deposit_accounts deactivation 안전 가드 (BIZ-6 DB-level 강제)
--
-- 변경 사유:
--   "활성 거래가 있는 계좌는 비활성화 불가" 규칙이 UI 모달에만 있고 RLS/서비스는
--   아무 검증 없이 deleted_at만 set. stale client·직접 SQL로 우회 가능.
--   DB BEFORE UPDATE 트리거로 invariant 강제.
--
-- 동작:
--   OLD.deleted_at IS NULL → NEW.deleted_at IS NOT NULL 전이일 때
--   해당 계좌의 활성(voided_at IS NULL) 거래가 1건이라도 있으면 차단.
--   재활성화(NOT NULL → NULL) 및 일반 UPDATE는 그대로 통과.

CREATE OR REPLACE FUNCTION public.assert_deposit_deactivation_safe()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active int;
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    SELECT COUNT(*) INTO v_active
      FROM deposit_transactions
     WHERE account_id = NEW.id
       AND voided_at IS NULL;

    IF v_active > 0 THEN
      RAISE EXCEPTION
        '활성 거래(%건)가 있는 예치금 계좌는 비활성화할 수 없습니다 (account_id=%)',
        v_active, NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_assert_deposit_deactivation_safe ON public.deposit_accounts;
CREATE TRIGGER trg_assert_deposit_deactivation_safe
BEFORE UPDATE OF deleted_at ON public.deposit_accounts
FOR EACH ROW EXECUTE FUNCTION public.assert_deposit_deactivation_safe();

-- 00030: 예치금 비활성화 가드 재정의 — "잔액 0" 기준 + 역할 게이트
--
-- 변경 사유:
--   기존(00028)은 "void 안 된 거래가 1건이라도 있으면 비활성화 불가"였음.
--   → 잔액이 0으로 정산 완료된 계좌(거래 이력 N건)도 영구히 못 닫는 오버블록.
--   비활성화 = soft delete(archive)이지 정산(close-out)이 아니므로,
--   차단 기준을 "활성 거래 존재"가 아니라 "잔액 != 0"으로 교체.
--   잔액이 남은 채 비활성화하면 추적되지 않는 숨은 부채가 생기므로 admin도 차단.
--
-- 역할 게이트:
--   비활성화(soft delete)는 admin·c_level·team_lead만 가능.
--   RLS UPDATE 정책은 can_access_contract만 보므로 DB-level 역할 강제를
--   이 트리거에서 함께 처리. (is_admin_clevel_or_lead, 00029 정의 재사용)
--
-- 동작:
--   OLD.deleted_at IS NULL → NEW.deleted_at IS NOT NULL (비활성화 전이)일 때만 검사:
--     1) 호출자가 admin·c_level·team_lead가 아니면 차단 (insufficient_privilege)
--     2) NEW.balance <> 0 이면 차단 (check_violation)
--   재활성화(NOT NULL → NULL) 및 일반 UPDATE는 그대로 통과.

CREATE OR REPLACE FUNCTION public.assert_deposit_deactivation_safe()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    IF NOT public.is_admin_clevel_or_lead() THEN
      RAISE EXCEPTION
        '예치금 계좌 비활성화 권한이 없습니다 (admin·c_level·team_lead 전용, account_id=%)',
        NEW.id
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.balance <> 0 THEN
      RAISE EXCEPTION
        '잔액이 0이 아닌 예치금 계좌는 비활성화할 수 없습니다 (잔액=%, account_id=%)',
        NEW.balance, NEW.id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 트리거 정의는 00028과 동일하므로 재생성 불필요(함수 본문만 교체).
-- 명시적 멱등성을 위해 재선언.
DROP TRIGGER IF EXISTS trg_assert_deposit_deactivation_safe ON public.deposit_accounts;
CREATE TRIGGER trg_assert_deposit_deactivation_safe
BEFORE UPDATE OF deleted_at ON public.deposit_accounts
FOR EACH ROW EXECUTE FUNCTION public.assert_deposit_deactivation_safe();

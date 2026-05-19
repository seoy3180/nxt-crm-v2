-- 00026: 비활성(soft-delete) 계좌에 거래 INSERT/UPDATE 차단
--
-- 변경 사유:
--   A 사용자가 계좌 deactivate 한 직후, B 사용자가 거래 등록 모달을 제출하면
--   ms 단위 race window에서 soft-delete된 계좌에 거래가 들어갈 수 있음.
--   UI 사전 검증(BIZ-6)만으로는 부족 → DB 단에서 BEFORE INSERT/UPDATE로 차단.
--
-- 동작:
--   - INSERT: 대상 계좌의 deleted_at IS NOT NULL이면 RAISE EXCEPTION
--   - UPDATE: amount/voided_at/txn_type 변경 시에도 동일 (단 voided_at만 set하는 경우는 허용 — 무효화는 비활성 후에도 가능)
--   - 비활성된 계좌에서 무효화는 immutable 로그 정리 목적이므로 허용

CREATE OR REPLACE FUNCTION public.assert_deposit_account_active()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_at timestamptz;
BEGIN
  SELECT deleted_at INTO v_deleted_at
    FROM deposit_accounts
   WHERE id = NEW.account_id;

  IF v_deleted_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- UPDATE 중 voided_at만 set하는 경우(무효화) 허용
  IF TG_OP = 'UPDATE'
     AND OLD.voided_at IS NULL
     AND NEW.voided_at IS NOT NULL
     AND NEW.amount    = OLD.amount
     AND NEW.txn_type  = OLD.txn_type THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION '비활성화된 예치금 계좌에는 거래를 등록/수정할 수 없습니다 (account_id=%)', NEW.account_id
    USING ERRCODE = 'check_violation';
END $$;

DROP TRIGGER IF EXISTS trg_assert_active_account ON deposit_transactions;
CREATE TRIGGER trg_assert_active_account
BEFORE INSERT OR UPDATE OF amount, txn_type, voided_at
ON deposit_transactions
FOR EACH ROW EXECUTE FUNCTION public.assert_deposit_account_active();

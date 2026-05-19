-- 00027: deposit_accounts.contract_id UNIQUE를 활성 row 한정으로 변경
--
-- 변경 사유:
--   00022에서 `contract_id uuid NOT NULL UNIQUE`로 전역 UNIQUE를 걸어둠.
--   계좌 deactivate는 soft delete(deleted_at set)만 하므로 옛 row가 contract_id를
--   계속 잡고 있어, 같은 계약 재활성화 시 unique violation 발생.
--
-- 새 정책:
--   - 전역 UNIQUE 제거
--   - 부분 unique index: 활성(deleted_at IS NULL) row에서만 contract_id 유일
--   - 비활성 row와 활성 row는 contract_id가 중복돼도 허용 (soft delete 정합성)
--
-- 데이터 가정: 적용 시점에 (contract_id, deleted_at IS NULL) 기준 중복 0건.

ALTER TABLE public.deposit_accounts
  DROP CONSTRAINT IF EXISTS deposit_accounts_contract_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS deposit_accounts_contract_id_active_unique
  ON public.deposit_accounts (contract_id)
  WHERE deleted_at IS NULL;

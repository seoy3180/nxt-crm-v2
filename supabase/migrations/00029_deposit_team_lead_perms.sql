-- 00029: 예치금 권한을 team_lead까지 확장
--
-- 변경 사유:
--   동식님(MSP팀 team_lead)이 잔액 보정·환불·무효화·계좌 활성화/비활성화/재활성화를
--   직접 수행해야 함. admin·c_level 한정이던 정책을 team_lead까지 확장.
--   접근 도메인 통제는 can_access_contract가 그대로 담당.
--
-- 영향 정책 (2건):
--   1) deposit_transactions INSERT — adjustment/refund 등록 가능 범위 확장
--   2) deposit_transactions UPDATE (void) — 무효화 가능 범위 확장
--
-- 변경 없음:
--   - deposit_accounts INSERT/UPDATE는 이미 can_access_contract만 검사하므로
--     UI 가드만 풀면 team_lead도 활성화/비활성화/재활성화 가능.

CREATE OR REPLACE FUNCTION public.is_admin_clevel_or_lead()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.is_admin_or_clevel()
      OR public.user_role() = 'team_lead'::user_role;
END $$;

DROP POLICY IF EXISTS deposit_txn_insert ON public.deposit_transactions;
CREATE POLICY deposit_txn_insert ON public.deposit_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deposit_accounts a
      WHERE a.id = deposit_transactions.account_id
        AND can_access_contract(a.contract_id)
    )
    AND (
      txn_type = ANY (ARRAY['deposit'::deposit_txn_type, 'usage'::deposit_txn_type])
      OR public.is_admin_clevel_or_lead()
    )
  );

DROP POLICY IF EXISTS deposit_txn_update ON public.deposit_transactions;
CREATE POLICY deposit_txn_update ON public.deposit_transactions
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR public.is_admin_clevel_or_lead()
  );

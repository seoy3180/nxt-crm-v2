-- 00025: can_access_contract 도메인 기반 fallback
--
-- 변경 사유:
--   기존 정책은 contract_teams 매핑이 있어야만 접근 가능 →
--   계약 생성만 하고 매출 분배를 안 했을 때 admin/c_level 외 모두 차단.
--   "MSP팀이면 MSP 계약 전체를 본다"가 운영 현실에 맞음.
--   contract_teams는 매출 분배 전용으로 의미 한정.
--
-- 새 정책:
--   1) admin / c_level  → 전체 통과
--   2) 도메인 매칭     → MSP팀↔msp, 교육팀↔tt, 개발팀↔dev
--   3) contract_teams 명시 매핑 (cross-team 공동 작업 + 과거 데이터 호환)
--
-- 영향 범위: contracts, contract_msp_details, contract_teams, contract_tech_leads,
--           contract_history, deposit_accounts, deposit_transactions,
--           education_operations, operation_instructors
--   → 정책은 `can_access_contract`를 그대로 호출하므로 함수만 교체하면 일괄 반영.

CREATE OR REPLACE FUNCTION public.can_access_contract(p_contract_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_name     TEXT;
  v_contract_type contract_type;
BEGIN
  IF public.is_admin_or_clevel() THEN
    RETURN TRUE;
  END IF;

  SELECT name INTO v_team_name
  FROM teams
  WHERE id = public.user_team_id();

  IF v_team_name IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT type INTO v_contract_type
  FROM contracts
  WHERE id = p_contract_id;

  IF v_contract_type IS NULL THEN
    RETURN FALSE;
  END IF;

  IF (v_team_name = 'MSP팀'  AND v_contract_type = 'msp'::contract_type)
     OR (v_team_name = '교육팀' AND v_contract_type = 'tt'::contract_type)
     OR (v_team_name = '개발팀' AND v_contract_type = 'dev'::contract_type) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM contract_teams
    WHERE contract_id = p_contract_id
      AND team_id = public.user_team_id()
      AND deleted_at IS NULL
  );
END;
$function$;

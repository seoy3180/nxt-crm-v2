-- 00032: clients / employees 권한 정비 (G2, G4)
--
-- G2 clients:
--   - SELECT: 인증 사용자 누구나 (조회 개방)
--   - INSERT/UPDATE/DELETE: 비즈니스 매칭 팀만
--       (client.business_types 중 하나라도 내 팀 담당 도메인이면 허용) + admin/c_level
-- G4 employees:
--   - C·U·D: admin만
--   - SELECT: 인증 사용자 유지 (담당자 선택 드롭다운 등에서 필요)

-- 1) can_access_client 재작성 — team_business_domains 기반
CREATE OR REPLACE FUNCTION public.can_access_client(p_client_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_type team_type;
BEGIN
  IF public.is_admin_or_clevel() THEN
    RETURN TRUE;
  END IF;

  SELECT t.type INTO v_team_type
  FROM teams t
  WHERE t.id = public.user_team_id();

  IF v_team_type IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 고객의 business_types 중 하나라도 내 팀 담당 도메인과 겹치면 허용
  RETURN EXISTS (
    SELECT 1
    FROM clients c
    JOIN team_business_domains d ON d.team_type = v_team_type
    WHERE c.id = p_client_id
      AND d.business_type = ANY (c.business_types)
  );
END;
$function$;

-- 2) clients SELECT 개방
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3) clients INSERT — 비즈니스 매칭 (NEW.business_types 직접 검사)
DROP POLICY IF EXISTS clients_insert ON public.clients;
CREATE POLICY clients_insert ON public.clients
  FOR INSERT
  WITH CHECK (
    public.is_admin_or_clevel()
    OR EXISTS (
      SELECT 1 FROM team_business_domains d
      WHERE d.team_type = (SELECT type FROM teams WHERE id = public.user_team_id())
        AND d.business_type = ANY (business_types)
    )
  );

-- 4) clients UPDATE/DELETE — 재작성된 can_access_client 그대로 사용 (정책 변경 불필요,
--    함수 본문만 바뀌었으므로 자동 반영). 명시적 재선언은 생략.

-- 5) employees C·U·D → admin만, SELECT 유지
DROP POLICY IF EXISTS staff_insert ON public.employees;
CREATE POLICY staff_insert ON public.employees
  FOR INSERT WITH CHECK (public.user_role() = 'admin'::user_role);

DROP POLICY IF EXISTS staff_update ON public.employees;
CREATE POLICY staff_update ON public.employees
  FOR UPDATE USING (public.user_role() = 'admin'::user_role);

DROP POLICY IF EXISTS staff_delete ON public.employees;
CREATE POLICY staff_delete ON public.employees
  FOR DELETE USING (public.user_role() = 'admin'::user_role);

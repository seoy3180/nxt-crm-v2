-- 00031-B: 팀/비즈니스 도메인 재구성 — 매핑 테이블 + RLS (Part B)
--
-- ⚠️ 00031_a를 먼저 Run한 뒤 이 파일을 Run (enum 신규 값 사용).
--
-- 내용:
--   1) team_business_domains 매핑 테이블 (M:N) + seed
--   2) can_access_contract 재작성 — 팀 이름 하드코딩 제거, 매핑 테이블 기반
--      + contract_teams 명시 매핑 fallback 유지 (cross-team 협업 대비)

-- 1) 팀 ↔ 비즈니스 도메인 매핑 (M:N)
CREATE TABLE IF NOT EXISTS public.team_business_domains (
  team_type     team_type     NOT NULL,
  business_type business_type NOT NULL,
  PRIMARY KEY (team_type, business_type)
);

ALTER TABLE public.team_business_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_business_domains_select ON public.team_business_domains;
CREATE POLICY team_business_domains_select ON public.team_business_domains
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- seed (멱등)
INSERT INTO public.team_business_domains (team_type, business_type) VALUES
  ('ops'::team_type, 'edu'::business_type),
  ('ops'::team_type, 'msp'::business_type),
  ('tt'::team_type,  'edu'::business_type),
  ('dev'::team_type, 'dev'::business_type),
  ('ai'::team_type,  'msp'::business_type),
  ('ptn'::team_type, 'msp'::business_type)
ON CONFLICT (team_type, business_type) DO NOTHING;

-- 2) can_access_contract 재작성
--    admin·c_level → 전체
--    그 외 → (팀 도메인이 계약 비즈니스를 담당) OR (contract_teams 명시 매핑)
CREATE OR REPLACE FUNCTION public.can_access_contract(p_contract_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_type     team_type;
  v_contract_type contract_type;
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

  SELECT type INTO v_contract_type
  FROM contracts
  WHERE id = p_contract_id;

  IF v_contract_type IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 팀 도메인이 계약 비즈니스를 담당하는가 (contract_type ↔ business_type 동일 라벨)
  IF EXISTS (
    SELECT 1 FROM team_business_domains d
    WHERE d.team_type = v_team_type
      AND d.business_type::text = v_contract_type::text
  ) THEN
    RETURN TRUE;
  END IF;

  -- contract_teams 명시 매핑 fallback (cross-team 협업)
  RETURN EXISTS (
    SELECT 1 FROM contract_teams
    WHERE contract_id = p_contract_id
      AND team_id = public.user_team_id()
      AND deleted_at IS NULL
  );
END;
$function$;

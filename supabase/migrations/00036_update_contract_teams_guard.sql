-- 00036: update_contract_teams 권한 가드 + search_path 고정 (보안 강화, 비즈니스 로직 무변경)
--
-- 배경: update_contract_teams는 매출 배분(contract_teams)의 DELETE+INSERT를 단일
--   트랜잭션으로 묶는 SECURITY DEFINER RPC인데, 두 가지 결함이 있었음.
--   (1) 진입부 권한 검사 부재 → 인증된 사용자라면 누구나 임의 계약의 배분을
--       덮어쓸 수 있었음 (SECURITY DEFINER가 RLS를 우회 = RLS 누수).
--   (2) search_path 미고정 → 임시 스키마(pg_temp) 객체 섀도잉에 노출.
--
-- 조치:
--   - can_access_contract(p_contract_id) 가드 추가. contract_teams 테이블의
--     INSERT/SELECT/UPDATE RLS 정책과 '동일한' 접근 술어를 RPC에서 재현한다
--     (조회 가능자 = 수정 가능자 모델. role 가드를 추가하면 테이블 정책보다
--      엄격해져 비일관 발생하므로 의도적으로 추가하지 않음).
--   - SET search_path = public, pg_temp → pg_temp를 맨 뒤로 밀어 객체 섀도잉
--     차단 (PostgreSQL SECURITY DEFINER 권장 패턴). 테이블명도 public. 명시 한정.
--
-- 비고: contract_teams에는 DELETE 정책이 없으므로, DELETE+INSERT 원자 처리를 위해
--   SECURITY DEFINER가 실제로 필요하다 (RLS만으로는 DELETE 불가).
--
-- 멱등: CREATE OR REPLACE이므로 운영 DB에 수동 적용 후 db push 재실행해도 안전.

CREATE OR REPLACE FUNCTION public.update_contract_teams(
  p_contract_id uuid,
  p_allocations jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.can_access_contract(p_contract_id) THEN
    RAISE EXCEPTION '계약 접근 권한이 없습니다 (contract_id=%)', p_contract_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM public.contract_teams
  WHERE contract_id = p_contract_id;

  IF jsonb_array_length(p_allocations) > 0 THEN
    INSERT INTO public.contract_teams (contract_id, team_id, percentage)
    SELECT
      p_contract_id,
      (elem->>'team_id')::uuid,
      (elem->>'percentage')::numeric
    FROM jsonb_array_elements(p_allocations) AS elem;
  END IF;
END;
$$;

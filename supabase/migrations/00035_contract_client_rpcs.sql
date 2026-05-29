-- 00035: 다단계 쓰기 RPC 트랜잭션화 (안전성 강화, 비즈니스 로직 무변경)
--
-- 배경: contract/client의 다단계 작업이 별도 호출로 쪼개져, 중간 실패 시
--   parent/child invariant가 깨지거나 감사 로그가 누락되는 사례가 있었음.
--   각 작업을 단일 PostgreSQL 함수(=한 트랜잭션)로 묶어 원자성 확보.
--
-- 권한: SECURITY DEFINER로 RLS 우회 → 함수 진입부에서 명시적으로
--   can_access_contract / can_access_client 검사 (검증 누락 = RLS 누수).
--
-- 5개 함수:
--   1) replace_contract_tech_leads — DELETE+INSERT 원자화
--   2) change_contract_stage       — UPDATE + history INSERT 원자화
--   3) soft_delete_contract        — contracts + 관련 4 테이블 deleted_at 동시
--   4) create_contract_with_details — contracts + msp_details + clients.business_types
--   5) soft_delete_client          — clients + 관련 3 테이블 deleted_at 동시

-- ─── 1. replace_contract_tech_leads ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.replace_contract_tech_leads(
  p_contract_id uuid,
  p_employee_ids uuid[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.can_access_contract(p_contract_id) THEN
    RAISE EXCEPTION '계약 접근 권한이 없습니다 (contract_id=%)', p_contract_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM contract_tech_leads WHERE contract_id = p_contract_id;

  IF p_employee_ids IS NOT NULL AND array_length(p_employee_ids, 1) > 0 THEN
    INSERT INTO contract_tech_leads (contract_id, employee_id)
    SELECT p_contract_id, unnest(p_employee_ids);
  END IF;
END $$;

-- ─── 2. change_contract_stage ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.change_contract_stage(uuid, text, text, uuid);
CREATE OR REPLACE FUNCTION public.change_contract_stage(
  p_contract_id uuid,
  p_to_stage text,
  p_user_id uuid,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_from_stage text;
BEGIN
  IF NOT public.can_access_contract(p_contract_id) THEN
    RAISE EXCEPTION '계약 접근 권한이 없습니다 (contract_id=%)', p_contract_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT stage INTO v_from_stage FROM contracts WHERE id = p_contract_id;

  UPDATE contracts SET stage = p_to_stage WHERE id = p_contract_id;

  INSERT INTO contract_history (
    contract_id, field_name, old_value, new_value,
    from_stage, to_stage, changed_by, note
  ) VALUES (
    p_contract_id, 'stage', v_from_stage, p_to_stage,
    v_from_stage, p_to_stage, p_user_id, p_note
  );
END $$;

-- ─── 3. soft_delete_contract ─────────────────────────────────────────────────
-- 잔액 사전 체크는 서비스 코드가 담당 (blocked 반환 UI 흐름 보존).
-- 본 함수는 update 4개를 원자화 + DB 트리거 guard_contract_delete_with_deposit이 최종 안전망.
CREATE OR REPLACE FUNCTION public.soft_delete_contract(p_contract_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_now timestamptz := now();
BEGIN
  IF NOT public.can_access_contract(p_contract_id) THEN
    RAISE EXCEPTION '계약 접근 권한이 없습니다 (contract_id=%)', p_contract_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE contracts             SET deleted_at = v_now WHERE id          = p_contract_id;
  UPDATE contract_teams        SET deleted_at = v_now WHERE contract_id = p_contract_id;
  UPDATE contract_msp_details  SET deleted_at = v_now WHERE contract_id = p_contract_id;
  UPDATE deposit_accounts      SET deleted_at = v_now WHERE contract_id = p_contract_id;
END $$;

-- ─── 4. create_contract_with_details ─────────────────────────────────────────
-- contracts INSERT + msp 타입이면 contract_msp_details INSERT + clients.business_types 보강.
-- 인자가 많아 jsonb로 받음. 반환은 생성된 contracts row (jsonb).
-- 같은 트랜잭션이라 contracts_select RLS의 자기참조 문제도 자연 회피.
CREATE OR REPLACE FUNCTION public.create_contract_with_details(p_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_client_id uuid           := (p_input->>'client_id')::uuid;
  v_type      contract_type  := (p_input->>'type')::contract_type;
  v_contract_id text;
  v_new_id    uuid;
  v_new_row   jsonb;
  v_bt        business_type;
  v_types     business_type[];
BEGIN
  IF NOT public.can_access_client(v_client_id) THEN
    RAISE EXCEPTION '고객 접근 권한이 없습니다 (client_id=%)', v_client_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 계약번호 자동 생성
  IF v_type = 'msp'::contract_type THEN
    v_contract_id := public.generate_msp_contract_id();
  ELSE
    v_contract_id := public.generate_edu_contract_id();
  END IF;

  INSERT INTO contracts (
    contract_id, client_id, type, name, memo, total_amount,
    currency, stage, assigned_to, contact_id
  ) VALUES (
    v_contract_id,
    v_client_id,
    v_type,
    p_input->>'name',
    p_input->>'memo',
    COALESCE((p_input->>'total_amount')::bigint, 0),
    COALESCE((p_input->>'currency')::currency_type, 'KRW'::currency_type),
    COALESCE(
      p_input->>'stage',
      CASE WHEN v_type = 'msp'::contract_type THEN 'pre_contract' ELSE NULL END
    ),
    NULLIF(p_input->>'assigned_to', '')::uuid,
    NULLIF(p_input->>'contact_id', '')::uuid
  )
  RETURNING id INTO v_new_id;

  -- MSP 계약은 details row 미리 생성
  IF v_type = 'msp'::contract_type THEN
    INSERT INTO contract_msp_details (contract_id) VALUES (v_new_id);
  END IF;

  -- 고객의 business_types에 해당 도메인 보강 (없을 때만)
  v_bt := (v_type::text)::business_type;
  SELECT business_types INTO v_types FROM clients WHERE id = v_client_id;
  IF NOT (v_bt = ANY(COALESCE(v_types, '{}'::business_type[]))) THEN
    UPDATE clients
      SET business_types = array_append(COALESCE(business_types, '{}'::business_type[]), v_bt)
      WHERE id = v_client_id;
  END IF;

  SELECT to_jsonb(c.*) INTO v_new_row FROM contracts c WHERE c.id = v_new_id;
  RETURN v_new_row;
END $$;

-- ─── 5. soft_delete_client ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.soft_delete_client(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_now timestamptz := now();
BEGIN
  IF NOT public.can_access_client(p_client_id) THEN
    RAISE EXCEPTION '고객 접근 권한이 없습니다 (client_id=%)', p_client_id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE clients             SET deleted_at = v_now WHERE id        = p_client_id;
  UPDATE contacts            SET deleted_at = v_now WHERE client_id = p_client_id;
  UPDATE client_msp_details  SET deleted_at = v_now WHERE client_id = p_client_id;
  UPDATE client_edu_details  SET deleted_at = v_now WHERE client_id = p_client_id;
END $$;

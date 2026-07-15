


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."billing_method_type" AS ENUM (
    '대표님 직접 청구',
    '매월 10일 세금계산서 발행',
    '공공기관 별도 청구'
);


ALTER TYPE "public"."billing_method_type" OWNER TO "postgres";


CREATE TYPE "public"."business_type" AS ENUM (
    'msp',
    'edu',
    'dev'
);


ALTER TYPE "public"."business_type" OWNER TO "postgres";


CREATE TYPE "public"."client_grade" AS ENUM (
    'A',
    'B',
    'C',
    'D',
    'E'
);


ALTER TYPE "public"."client_grade" OWNER TO "postgres";


CREATE TYPE "public"."client_status_type" AS ENUM (
    '신규',
    '진행중',
    '활성',
    '휴면',
    '종료',
    '상태없음'
);


ALTER TYPE "public"."client_status_type" OWNER TO "postgres";


CREATE TYPE "public"."client_type" AS ENUM (
    'univ',
    'corp',
    'govt',
    'asso',
    'etc'
);


ALTER TYPE "public"."client_type" OWNER TO "postgres";


CREATE TYPE "public"."company_size_type" AS ENUM (
    '스타트업',
    '중소기업',
    '중견기업',
    '대기업',
    '공공기관'
);


ALTER TYPE "public"."company_size_type" OWNER TO "postgres";


CREATE TYPE "public"."contract_type" AS ENUM (
    'msp',
    'edu',
    'dev'
);


ALTER TYPE "public"."contract_type" OWNER TO "postgres";


CREATE TYPE "public"."credit_share_type" AS ENUM (
    '가능',
    '불가능',
    '미정'
);


ALTER TYPE "public"."credit_share_type" OWNER TO "postgres";


CREATE TYPE "public"."currency_type" AS ENUM (
    'KRW',
    'USD'
);


ALTER TYPE "public"."currency_type" OWNER TO "postgres";


CREATE TYPE "public"."deposit_txn_source" AS ENUM (
    'manual',
    'aws_api',
    'billing_on'
);


ALTER TYPE "public"."deposit_txn_source" OWNER TO "postgres";


CREATE TYPE "public"."deposit_txn_type" AS ENUM (
    'deposit',
    'usage',
    'adjustment',
    'refund'
);


ALTER TYPE "public"."deposit_txn_type" OWNER TO "postgres";


CREATE TYPE "public"."industry_type" AS ENUM (
    'IT',
    '제조',
    '금융',
    '유통',
    '공공',
    '서울대 연구실',
    '기타'
);


ALTER TYPE "public"."industry_type" OWNER TO "postgres";


CREATE TYPE "public"."msp_grade_type" AS ENUM (
    'None',
    'FREE',
    'MSP10',
    'MSP15',
    'MSP20',
    'ETC'
);


ALTER TYPE "public"."msp_grade_type" OWNER TO "postgres";


CREATE TYPE "public"."payer_type" AS ENUM (
    'ETV-AWS-13',
    'ETV-AWS-14',
    'Org-001',
    'Billing Transfer'
);


ALTER TYPE "public"."payer_type" OWNER TO "postgres";


CREATE TYPE "public"."team_type" AS ENUM (
    'msp',
    'tt',
    'dev',
    'ops',
    'ai',
    'ptn'
);


ALTER TYPE "public"."team_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'staff',
    'team_lead',
    'admin',
    'c_level'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_deposit_account_active"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."assert_deposit_account_active"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_deposit_deactivation_safe"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."assert_deposit_deactivation_safe"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_client"("p_client_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."can_access_client"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_contract"("p_contract_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."can_access_contract"("p_contract_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_to_stage" "text", "p_user_id" "uuid", "p_note" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_to_stage" "text", "p_user_id" "uuid", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_client_hierarchy"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM clients WHERE id = NEW.parent_id AND parent_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION '고객 계층은 2단계까지만 가능합니다';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_client_hierarchy"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_contract_with_details"("p_input" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  DECLARE
    v_client_id uuid := (p_input->>'client_id')::uuid;
    v_type contract_type := (p_input->>'type')::contract_type;
    v_contract_id text; v_new_id uuid; v_new_row jsonb;
    v_bt business_type; v_types business_type[];
  BEGIN
    IF NOT public.can_access_client(v_client_id) THEN
      RAISE EXCEPTION '고객 접근 권한이 없습니다 (client_id=%)', v_client_id USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF v_type = 'msp'::contract_type THEN v_contract_id := public.generate_msp_contract_id();
    ELSE v_contract_id := public.generate_edu_contract_id(); END IF;
    INSERT INTO contracts (contract_id, client_id, type, name, memo, total_amount, currency, stage, assigned_to,
  contact_id)
    VALUES (v_contract_id, v_client_id, v_type, p_input->>'name', p_input->>'memo',
            COALESCE((p_input->>'total_amount')::bigint, 0),
            COALESCE((p_input->>'currency')::currency_type, 'KRW'::currency_type),
            COALESCE(p_input->>'stage', CASE WHEN v_type = 'msp'::contract_type THEN 'pre_contract' ELSE NULL END),
            NULLIF(p_input->>'assigned_to', '')::uuid, NULLIF(p_input->>'contact_id', '')::uuid)
    RETURNING id INTO v_new_id;
    IF v_type = 'msp'::contract_type THEN INSERT INTO contract_msp_details (contract_id) VALUES (v_new_id); END IF;
    v_bt := (v_type::text)::business_type;
    SELECT business_types INTO v_types FROM clients WHERE id = v_client_id;
    IF NOT (v_bt = ANY(COALESCE(v_types, '{}'::business_type[]))) THEN
      UPDATE clients SET business_types = array_append(COALESCE(business_types, '{}'::business_type[]), v_bt)
      WHERE id = v_client_id;
    END IF;
    SELECT to_jsonb(c.*) INTO v_new_row FROM contracts c WHERE c.id = v_new_id;
    RETURN v_new_row;
  END $$;


ALTER FUNCTION "public"."create_contract_with_details"("p_input" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_client_id"("p_type" "public"."client_type") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  prefix TEXT;
  seq INT;
BEGIN
  CASE p_type
    WHEN 'univ' THEN prefix := 'UNIV';
    WHEN 'corp' THEN prefix := 'CORP';
    WHEN 'govt' THEN prefix := 'GOVT';
    WHEN 'asso' THEN prefix := 'ASSO';
    WHEN 'etc' THEN prefix := 'ETC';
  END CASE;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(client_id FROM LENGTH(prefix) + 2) AS INT)
  ), 0) + 1
  INTO seq
  FROM clients
  WHERE client_id LIKE prefix || '-%';

  RETURN prefix || '-' || LPAD(seq::TEXT, 3, '0');
END;
$$;


ALTER FUNCTION "public"."generate_client_id"("p_type" "public"."client_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_edu_contract_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  yr TEXT;
  seq INT;
BEGIN
  yr := EXTRACT(YEAR FROM now())::TEXT;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_id FROM 7) AS INT)
  ), 0) + 1
  INTO seq
  FROM contracts
  WHERE contract_id LIKE 'CT' || yr || '%';

  RETURN 'CT' || yr || LPAD(seq::TEXT, 3, '0');
END;
$$;


ALTER FUNCTION "public"."generate_edu_contract_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_msp_contract_id"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_id FROM 5) AS INT)
  ), 0) + 1
  INTO seq
  FROM contracts
  WHERE contract_id LIKE 'MSP-%';

  RETURN 'MSP-' || LPAD(seq::TEXT, 3, '0');
END;
$$;


ALTER FUNCTION "public"."generate_msp_contract_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_contract_delete_with_deposit"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM deposit_accounts
       WHERE contract_id = NEW.id
         AND deleted_at IS NULL
         AND balance <> 0
    ) THEN
      RAISE EXCEPTION 'DEPOSIT_BALANCE_NOT_ZERO'
        USING HINT = '예치금 잔액이 남아있어 계약을 종료할 수 없습니다. 환불(refund) 후 다시 시도하세요.';
    END IF;
  END IF;
  RETURN NEW;
END $$;


ALTER FUNCTION "public"."guard_contract_delete_with_deposit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."immutable_array_to_string"("arr" "text"[]) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$ SELECT array_to_string(arr, ' '); $$;


ALTER FUNCTION "public"."immutable_array_to_string"("arr" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_clevel_or_lead"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN public.is_admin_or_clevel()
      OR public.user_role() = 'team_lead'::user_role;
END $$;


ALTER FUNCTION "public"."is_admin_clevel_or_lead"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_clevel"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT public.user_role() IN ('admin', 'c_level');
$$;


ALTER FUNCTION "public"."is_admin_or_clevel"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_deposit_account_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  target_account_id  uuid;
  v_total_deposit    bigint;
  v_total_usage      bigint;
  v_total_adjustment bigint;
  v_total_refund     bigint;
BEGIN
  target_account_id := COALESCE(NEW.account_id, OLD.account_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposit
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'deposit'::deposit_txn_type
     AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_usage
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'usage'::deposit_txn_type
     AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_adjustment
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'adjustment'::deposit_txn_type
     AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_refund
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'refund'::deposit_txn_type
     AND voided_at IS NULL;

  UPDATE deposit_accounts SET
    total_deposit  = v_total_deposit,
    total_usage    = v_total_usage,
    balance        = v_total_deposit - v_total_usage + v_total_adjustment - v_total_refund,
    last_recalc_at = now(),
    updated_at     = now()
   WHERE id = target_account_id;

  RETURN NULL;
END $$;


ALTER FUNCTION "public"."recalc_deposit_account_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."replace_contract_tech_leads"("p_contract_id" "uuid", "p_employee_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."replace_contract_tech_leads"("p_contract_id" "uuid", "p_employee_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_client"("p_client_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."soft_delete_client"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_contract"("p_contract_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."soft_delete_contract"("p_contract_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contract_teams"("p_contract_id" "uuid", "p_allocations" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
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


ALTER FUNCTION "public"."update_contract_teams"("p_contract_id" "uuid", "p_allocations" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_role"() RETURNS "public"."user_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_team_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."user_team_id"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."client_edu_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "edu_grade" "text",
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."client_edu_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "client_type" "public"."client_type" NOT NULL,
    "grade" "public"."client_grade",
    "business_types" "public"."business_type"[] DEFAULT '{}'::"public"."business_type"[],
    "parent_id" "uuid",
    "status" "public"."client_status_type" DEFAULT '상태없음'::"public"."client_status_type" NOT NULL,
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_id" "text" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "type" "public"."contract_type" NOT NULL,
    "name" "text" NOT NULL,
    "memo" "text",
    "total_amount" bigint DEFAULT 0,
    "currency" "public"."currency_type" DEFAULT 'KRW'::"public"."currency_type",
    "stage" "text",
    "assigned_to" "uuid",
    "contact_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "contracts_stage_check" CHECK ((("stage" IS NULL) OR (("type" = 'msp'::"public"."contract_type") AND ("stage" = ANY (ARRAY['pre_contract'::"text", 'billing_complete'::"text", 'project_closed'::"text", 'unpaid'::"text"]))) OR (("type" = 'edu'::"public"."contract_type") AND ("stage" = ANY (ARRAY['proposal'::"text", 'contracted'::"text", 'operating'::"text", 'op_completed'::"text", 'settled'::"text"]))) OR ("type" = 'dev'::"public"."contract_type")))
);


ALTER TABLE "public"."contracts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."client_list_view" WITH ("security_invoker"='true') AS
 SELECT "id",
    "client_id",
    "name",
    "client_type",
    "grade",
    "business_types",
    "parent_id",
    "status",
    "memo",
    "created_at",
    "updated_at",
    "deleted_at",
    ( SELECT "count"(*) AS "count"
           FROM "public"."contracts" "ct"
          WHERE (("ct"."client_id" = "c"."id") AND ("ct"."deleted_at" IS NULL))) AS "contract_count"
   FROM "public"."clients" "c"
  WHERE ("deleted_at" IS NULL);


ALTER VIEW "public"."client_list_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."client_msp_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "industry" "public"."industry_type",
    "company_size" "public"."company_size_type",
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."client_msp_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "department" "text",
    "position" "text",
    "role" "text",
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "from_stage" "text",
    "to_stage" "text",
    "changed_by" "uuid" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "field_name" "text" DEFAULT 'stage'::"text",
    "old_value" "text",
    "new_value" "text"
);


ALTER TABLE "public"."contract_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_msp_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "credit_share" "public"."credit_share_type",
    "expected_mrr" bigint,
    "payer" "public"."payer_type",
    "aws_amount" bigint,
    "has_management_fee" boolean DEFAULT false,
    "billing_method" "public"."billing_method_type",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sales_rep_id" "uuid",
    "aws_account_ids" "text"[] DEFAULT '{}'::"text"[],
    "aws_am" "text",
    "msp_grade" "public"."msp_grade_type",
    "billing_on" boolean DEFAULT false NOT NULL,
    "billing_on_alias" "text",
    "deleted_at" timestamp with time zone,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "root_account_email" "text",
    "aws_account_search" "text" GENERATED ALWAYS AS ("public"."immutable_array_to_string"("aws_account_ids")) STORED
);


ALTER TABLE "public"."contract_msp_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "team_id" "uuid" NOT NULL,
    "percentage" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "contract_teams_percentage_check" CHECK ((("percentage" > (0)::numeric) AND ("percentage" <= (100)::numeric)))
);


ALTER TABLE "public"."contract_teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contract_tech_leads" (
    "contract_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contract_tech_leads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'staff'::"public"."user_role" NOT NULL,
    "team_id" "uuid",
    "position" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."contracts_with_details" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."contract_id",
    "c"."client_id",
    "c"."type",
    "c"."name",
    "c"."memo",
    "c"."total_amount",
    "c"."currency",
    "c"."stage",
    "c"."assigned_to",
    "c"."contact_id",
    "c"."created_at",
    "c"."updated_at",
    "c"."deleted_at",
    "msp"."credit_share",
    "msp"."expected_mrr",
    "msp"."payer",
    "msp"."sales_rep_id",
    "msp"."aws_amount",
    "msp"."has_management_fee",
    "msp"."billing_method",
    "msp"."aws_account_ids",
    "msp"."aws_am",
    "msp"."msp_grade",
    "msp"."billing_on",
    "cl"."name" AS "client_name",
    "cl"."client_id" AS "client_display_id",
    "e"."name" AS "assigned_to_name"
   FROM ((("public"."contracts" "c"
     LEFT JOIN "public"."contract_msp_details" "msp" ON (("msp"."contract_id" = "c"."id")))
     LEFT JOIN "public"."clients" "cl" ON (("cl"."id" = "c"."client_id")))
     LEFT JOIN "public"."employees" "e" ON (("e"."id" = "c"."assigned_to")))
  WHERE ("c"."deleted_at" IS NULL);


ALTER VIEW "public"."contracts_with_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deposit_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "balance" bigint DEFAULT 0 NOT NULL,
    "total_deposit" bigint DEFAULT 0 NOT NULL,
    "total_usage" bigint DEFAULT 0 NOT NULL,
    "last_recalc_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."deposit_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deposit_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "txn_date" "date" NOT NULL,
    "txn_type" "public"."deposit_txn_type" NOT NULL,
    "amount" bigint NOT NULL,
    "memo" "text",
    "source" "public"."deposit_txn_source" DEFAULT 'manual'::"public"."deposit_txn_source" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "voided_at" timestamp with time zone,
    "voided_by" "uuid",
    "void_reason" "text",
    CONSTRAINT "amount_sign_check" CHECK (((("txn_type" = ANY (ARRAY['deposit'::"public"."deposit_txn_type", 'usage'::"public"."deposit_txn_type", 'refund'::"public"."deposit_txn_type"])) AND ("amount" > 0)) OR (("txn_type" = 'adjustment'::"public"."deposit_txn_type") AND ("amount" <> 0))))
);


ALTER TABLE "public"."deposit_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."education_operation_dates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "education_date" "date" NOT NULL,
    "hours" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."education_operation_dates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."education_operations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "contract_id" "uuid" NOT NULL,
    "operation_name" "text" NOT NULL,
    "location" "text",
    "target_org" "text",
    "start_date" "date",
    "end_date" "date",
    "total_hours" numeric(6,1),
    "contracted_count" integer,
    "recruited_count" integer,
    "actual_count" integer,
    "provides_lunch" boolean DEFAULT false,
    "provides_snack" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "notes" "text",
    "date_list" "date"[] DEFAULT '{}'::"date"[]
);


ALTER TABLE "public"."education_operations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "team_id" "uuid",
    "position" "text",
    "profile_id" "uuid",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_sales_rep" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."instructors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "organization" "text",
    "team" "text",
    "position" "text",
    "status" "text" DEFAULT '활동'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."instructors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."operation_instructors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "assigned_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);


ALTER TABLE "public"."operation_instructors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_business_domains" (
    "team_type" "public"."team_type" NOT NULL,
    "business_type" "public"."business_type" NOT NULL
);


ALTER TABLE "public"."team_business_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."team_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."client_edu_details"
    ADD CONSTRAINT "client_edu_details_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."client_edu_details"
    ADD CONSTRAINT "client_edu_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."client_msp_details"
    ADD CONSTRAINT "client_msp_details_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."client_msp_details"
    ADD CONSTRAINT "client_msp_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_history"
    ADD CONSTRAINT "contract_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_msp_details"
    ADD CONSTRAINT "contract_msp_details_contract_id_key" UNIQUE ("contract_id");



ALTER TABLE ONLY "public"."contract_msp_details"
    ADD CONSTRAINT "contract_msp_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_teams"
    ADD CONSTRAINT "contract_teams_contract_id_team_id_key" UNIQUE ("contract_id", "team_id");



ALTER TABLE ONLY "public"."contract_teams"
    ADD CONSTRAINT "contract_teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contract_tech_leads"
    ADD CONSTRAINT "contract_tech_leads_pkey" PRIMARY KEY ("contract_id", "employee_id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_contract_id_key" UNIQUE ("contract_id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deposit_accounts"
    ADD CONSTRAINT "deposit_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deposit_transactions"
    ADD CONSTRAINT "deposit_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_operation_dates"
    ADD CONSTRAINT "education_operation_dates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."education_operations"
    ADD CONSTRAINT "education_operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."instructors"
    ADD CONSTRAINT "instructors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."operation_instructors"
    ADD CONSTRAINT "operation_instructors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "staff_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_business_domains"
    ADD CONSTRAINT "team_business_domains_pkey" PRIMARY KEY ("team_type", "business_type");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



CREATE UNIQUE INDEX "deposit_accounts_contract_id_active_unique" ON "public"."deposit_accounts" USING "btree" ("contract_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_clients_active" ON "public"."clients" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_clients_name_trgm" ON "public"."clients" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_clients_parent" ON "public"."clients" USING "btree" ("parent_id") WHERE ("parent_id" IS NOT NULL);



CREATE INDEX "idx_contacts_active" ON "public"."contacts" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_contacts_client" ON "public"."contacts" USING "btree" ("client_id");



CREATE INDEX "idx_contacts_name_trgm" ON "public"."contacts" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_contract_history_contract" ON "public"."contract_history" USING "btree" ("contract_id");



CREATE INDEX "idx_contract_msp_details_aws_search" ON "public"."contract_msp_details" USING "gin" ("aws_account_search" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_contract_teams_contract" ON "public"."contract_teams" USING "btree" ("contract_id");



CREATE INDEX "idx_contract_teams_team" ON "public"."contract_teams" USING "btree" ("team_id");



CREATE INDEX "idx_contract_tech_leads_employee" ON "public"."contract_tech_leads" USING "btree" ("employee_id");



CREATE INDEX "idx_contracts_active" ON "public"."contracts" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_contracts_client" ON "public"."contracts" USING "btree" ("client_id");



CREATE INDEX "idx_contracts_name_trgm" ON "public"."contracts" USING "gin" ("name" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_contracts_stage" ON "public"."contracts" USING "btree" ("stage");



CREATE INDEX "idx_contracts_type" ON "public"."contracts" USING "btree" ("type");



CREATE INDEX "idx_deposit_accounts_contract" ON "public"."deposit_accounts" USING "btree" ("contract_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_deposit_txn_account_date" ON "public"."deposit_transactions" USING "btree" ("account_id", "txn_date" DESC) WHERE ("voided_at" IS NULL);



CREATE INDEX "idx_deposit_txn_active" ON "public"."deposit_transactions" USING "btree" ("account_id") WHERE ("voided_at" IS NULL);



CREATE INDEX "idx_edu_op_dates_operation_id" ON "public"."education_operation_dates" USING "btree" ("operation_id");



CREATE UNIQUE INDEX "idx_edu_op_dates_unique" ON "public"."education_operation_dates" USING "btree" ("operation_id", "education_date");



CREATE INDEX "idx_education_ops_contract" ON "public"."education_operations" USING "btree" ("contract_id");



CREATE UNIQUE INDEX "idx_employees_profile_id" ON "public"."employees" USING "btree" ("profile_id") WHERE ("profile_id" IS NOT NULL);



CREATE INDEX "idx_employees_team_id" ON "public"."employees" USING "btree" ("team_id");



CREATE INDEX "idx_operation_instructors_ins" ON "public"."operation_instructors" USING "btree" ("instructor_id");



CREATE INDEX "idx_operation_instructors_op" ON "public"."operation_instructors" USING "btree" ("operation_id");



CREATE OR REPLACE TRIGGER "client_edu_details_updated_at" BEFORE UPDATE ON "public"."client_edu_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "client_msp_details_updated_at" BEFORE UPDATE ON "public"."client_msp_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "clients_hierarchy_check" BEFORE INSERT OR UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."check_client_hierarchy"();



CREATE OR REPLACE TRIGGER "clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "contacts_updated_at" BEFORE UPDATE ON "public"."contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "contract_msp_details_updated_at" BEFORE UPDATE ON "public"."contract_msp_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "contract_teams_updated_at" BEFORE UPDATE ON "public"."contract_teams" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "contracts_updated_at" BEFORE UPDATE ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "deposit_accounts_updated_at" BEFORE UPDATE ON "public"."deposit_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "education_operations_updated_at" BEFORE UPDATE ON "public"."education_operations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "instructors_updated_at" BEFORE UPDATE ON "public"."instructors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_assert_active_account" BEFORE INSERT OR UPDATE OF "amount", "txn_type", "voided_at" ON "public"."deposit_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."assert_deposit_account_active"();



CREATE OR REPLACE TRIGGER "trg_assert_deposit_deactivation_safe" BEFORE UPDATE OF "deleted_at" ON "public"."deposit_accounts" FOR EACH ROW EXECUTE FUNCTION "public"."assert_deposit_deactivation_safe"();



CREATE OR REPLACE TRIGGER "trg_contract_delete_guard" BEFORE UPDATE OF "deleted_at" ON "public"."contracts" FOR EACH ROW EXECUTE FUNCTION "public"."guard_contract_delete_with_deposit"();



CREATE OR REPLACE TRIGGER "trg_deposit_txn_recalc" AFTER INSERT OR DELETE OR UPDATE OF "amount", "voided_at", "txn_type" ON "public"."deposit_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."recalc_deposit_account_balance"();



CREATE OR REPLACE TRIGGER "update_staff_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."client_edu_details"
    ADD CONSTRAINT "client_edu_details_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."client_msp_details"
    ADD CONSTRAINT "client_msp_details_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."clients"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."contacts"
    ADD CONSTRAINT "contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_history"
    ADD CONSTRAINT "contract_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."contract_history"
    ADD CONSTRAINT "contract_history_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_msp_details"
    ADD CONSTRAINT "contract_msp_details_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_msp_details"
    ADD CONSTRAINT "contract_msp_details_sales_rep_id_fkey" FOREIGN KEY ("sales_rep_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."contract_teams"
    ADD CONSTRAINT "contract_teams_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_teams"
    ADD CONSTRAINT "contract_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."contract_tech_leads"
    ADD CONSTRAINT "contract_tech_leads_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contract_tech_leads"
    ADD CONSTRAINT "contract_tech_leads_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id");



ALTER TABLE ONLY "public"."contracts"
    ADD CONSTRAINT "contracts_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id");



ALTER TABLE ONLY "public"."deposit_accounts"
    ADD CONSTRAINT "deposit_accounts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id");



ALTER TABLE ONLY "public"."deposit_transactions"
    ADD CONSTRAINT "deposit_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."deposit_accounts"("id");



ALTER TABLE ONLY "public"."deposit_transactions"
    ADD CONSTRAINT "deposit_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."deposit_transactions"
    ADD CONSTRAINT "deposit_transactions_voided_by_fkey" FOREIGN KEY ("voided_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."education_operation_dates"
    ADD CONSTRAINT "education_operation_dates_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."education_operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."education_operations"
    ADD CONSTRAINT "education_operations_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."operation_instructors"
    ADD CONSTRAINT "operation_instructors_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "public"."instructors"("id");



ALTER TABLE ONLY "public"."operation_instructors"
    ADD CONSTRAINT "operation_instructors_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "public"."education_operations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "staff_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "staff_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE "public"."client_edu_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_edu_insert" ON "public"."client_edu_details" FOR INSERT WITH CHECK ("public"."can_access_client"("client_id"));



CREATE POLICY "client_edu_select" ON "public"."client_edu_details" FOR SELECT USING ("public"."can_access_client"("client_id"));



CREATE POLICY "client_edu_update" ON "public"."client_edu_details" FOR UPDATE USING ("public"."can_access_client"("client_id"));



ALTER TABLE "public"."client_msp_details" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_msp_insert" ON "public"."client_msp_details" FOR INSERT WITH CHECK ("public"."can_access_client"("client_id"));



CREATE POLICY "client_msp_select" ON "public"."client_msp_details" FOR SELECT USING ("public"."can_access_client"("client_id"));



CREATE POLICY "client_msp_update" ON "public"."client_msp_details" FOR UPDATE USING ("public"."can_access_client"("client_id"));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete" ON "public"."clients" FOR DELETE USING ("public"."can_access_client"("id"));



CREATE POLICY "clients_insert" ON "public"."clients" FOR INSERT WITH CHECK (("public"."is_admin_or_clevel"() OR (EXISTS ( SELECT 1
   FROM "public"."team_business_domains" "d"
  WHERE (("d"."team_type" = ( SELECT "teams"."type"
           FROM "public"."teams"
          WHERE ("teams"."id" = "public"."user_team_id"()))) AND ("d"."business_type" = ANY ("clients"."business_types")))))));



CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "clients_update" ON "public"."clients" FOR UPDATE USING ("public"."can_access_client"("id"));



ALTER TABLE "public"."contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contacts_delete" ON "public"."contacts" FOR DELETE USING ("public"."can_access_client"("client_id"));



CREATE POLICY "contacts_insert" ON "public"."contacts" FOR INSERT WITH CHECK ("public"."can_access_client"("client_id"));



CREATE POLICY "contacts_select" ON "public"."contacts" FOR SELECT USING ("public"."can_access_client"("client_id"));



CREATE POLICY "contacts_update" ON "public"."contacts" FOR UPDATE USING ("public"."can_access_client"("client_id"));



ALTER TABLE "public"."contract_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_msp_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."contract_teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contract_teams_insert" ON "public"."contract_teams" FOR INSERT WITH CHECK ("public"."can_access_contract"("contract_id"));



CREATE POLICY "contract_teams_select" ON "public"."contract_teams" FOR SELECT USING ("public"."can_access_contract"("contract_id"));



CREATE POLICY "contract_teams_update" ON "public"."contract_teams" FOR UPDATE USING ("public"."can_access_contract"("contract_id"));



ALTER TABLE "public"."contract_tech_leads" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contract_tech_leads_delete" ON "public"."contract_tech_leads" FOR DELETE USING ("public"."can_access_contract"("contract_id"));



CREATE POLICY "contract_tech_leads_insert" ON "public"."contract_tech_leads" FOR INSERT WITH CHECK ("public"."can_access_contract"("contract_id"));



CREATE POLICY "contract_tech_leads_select" ON "public"."contract_tech_leads" FOR SELECT USING ("public"."can_access_contract"("contract_id"));



ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contracts_delete" ON "public"."contracts" FOR DELETE USING ("public"."can_access_contract"("id"));



CREATE POLICY "contracts_insert" ON "public"."contracts" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "contracts_select" ON "public"."contracts" FOR SELECT USING ("public"."can_access_contract"("id"));



CREATE POLICY "contracts_update" ON "public"."contracts" FOR UPDATE USING ("public"."can_access_contract"("id"));



ALTER TABLE "public"."deposit_accounts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deposit_accounts_insert" ON "public"."deposit_accounts" FOR INSERT WITH CHECK (("public"."can_access_contract"("contract_id") AND (EXISTS ( SELECT 1
   FROM "public"."contracts" "c"
  WHERE (("c"."id" = "deposit_accounts"."contract_id") AND ("c"."type" = 'msp'::"public"."contract_type"))))));



CREATE POLICY "deposit_accounts_select" ON "public"."deposit_accounts" FOR SELECT USING (("public"."can_access_contract"("contract_id") AND (EXISTS ( SELECT 1
   FROM "public"."contracts" "c"
  WHERE (("c"."id" = "deposit_accounts"."contract_id") AND ("c"."type" = 'msp'::"public"."contract_type") AND ("c"."deleted_at" IS NULL))))));



CREATE POLICY "deposit_accounts_update" ON "public"."deposit_accounts" FOR UPDATE USING ("public"."can_access_contract"("contract_id"));



ALTER TABLE "public"."deposit_transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "deposit_txn_insert" ON "public"."deposit_transactions" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."deposit_accounts" "a"
  WHERE (("a"."id" = "deposit_transactions"."account_id") AND "public"."can_access_contract"("a"."contract_id")))) AND (("txn_type" = ANY (ARRAY['deposit'::"public"."deposit_txn_type", 'usage'::"public"."deposit_txn_type"])) OR "public"."is_admin_clevel_or_lead"())));



CREATE POLICY "deposit_txn_select" ON "public"."deposit_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."deposit_accounts" "a"
  WHERE (("a"."id" = "deposit_transactions"."account_id") AND "public"."can_access_contract"("a"."contract_id")))));



CREATE POLICY "deposit_txn_update" ON "public"."deposit_transactions" FOR UPDATE USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin_clevel_or_lead"()));



CREATE POLICY "edu_op_dates_delete" ON "public"."education_operation_dates" FOR DELETE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "edu_op_dates_insert" ON "public"."education_operation_dates" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "edu_op_dates_select" ON "public"."education_operation_dates" FOR SELECT USING (true);



CREATE POLICY "edu_op_dates_update" ON "public"."education_operation_dates" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "edu_ops_delete" ON "public"."education_operations" FOR DELETE USING ("public"."can_access_contract"("contract_id"));



CREATE POLICY "edu_ops_insert" ON "public"."education_operations" FOR INSERT WITH CHECK ("public"."can_access_contract"("contract_id"));



CREATE POLICY "edu_ops_select" ON "public"."education_operations" FOR SELECT USING ("public"."can_access_contract"("contract_id"));



CREATE POLICY "edu_ops_update" ON "public"."education_operations" FOR UPDATE USING ("public"."can_access_contract"("contract_id"));



ALTER TABLE "public"."education_operation_dates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."education_operations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "history_insert" ON "public"."contract_history" FOR INSERT WITH CHECK ("public"."can_access_contract"("contract_id"));



CREATE POLICY "history_select" ON "public"."contract_history" FOR SELECT USING ("public"."can_access_contract"("contract_id"));



ALTER TABLE "public"."instructors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "instructors_insert" ON "public"."instructors" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "instructors_select" ON "public"."instructors" FOR SELECT USING (true);



CREATE POLICY "instructors_update" ON "public"."instructors" FOR UPDATE USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "msp_details_insert" ON "public"."contract_msp_details" FOR INSERT WITH CHECK ("public"."can_access_contract"("contract_id"));



CREATE POLICY "msp_details_select" ON "public"."contract_msp_details" FOR SELECT USING ("public"."can_access_contract"("contract_id"));



CREATE POLICY "msp_details_update" ON "public"."contract_msp_details" FOR UPDATE USING ("public"."can_access_contract"("contract_id"));



CREATE POLICY "op_instructors_delete" ON "public"."operation_instructors" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."education_operations" "eo"
  WHERE (("eo"."id" = "operation_instructors"."operation_id") AND "public"."can_access_contract"("eo"."contract_id")))));



CREATE POLICY "op_instructors_insert" ON "public"."operation_instructors" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."education_operations" "eo"
  WHERE (("eo"."id" = "operation_instructors"."operation_id") AND "public"."can_access_contract"("eo"."contract_id")))));



CREATE POLICY "op_instructors_select" ON "public"."operation_instructors" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."education_operations" "eo"
  WHERE (("eo"."id" = "operation_instructors"."operation_id") AND "public"."can_access_contract"("eo"."contract_id")))));



CREATE POLICY "op_instructors_update" ON "public"."operation_instructors" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."education_operations" "eo"
  WHERE (("eo"."id" = "operation_instructors"."operation_id") AND "public"."can_access_contract"("eo"."contract_id")))));



ALTER TABLE "public"."operation_instructors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "prefs_insert" ON "public"."user_preferences" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_select" ON "public"."user_preferences" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "prefs_update" ON "public"."user_preferences" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"()));



CREATE POLICY "staff_delete" ON "public"."employees" FOR DELETE USING (("public"."user_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "staff_insert" ON "public"."employees" FOR INSERT WITH CHECK (("public"."user_role"() = 'admin'::"public"."user_role"));



CREATE POLICY "staff_select" ON "public"."employees" FOR SELECT USING (true);



CREATE POLICY "staff_update" ON "public"."employees" FOR UPDATE USING (("public"."user_role"() = 'admin'::"public"."user_role"));



ALTER TABLE "public"."team_business_domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_business_domains_select" ON "public"."team_business_domains" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_select" ON "public"."teams" FOR SELECT USING (true);



ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."assert_deposit_account_active"() TO "anon";
GRANT ALL ON FUNCTION "public"."assert_deposit_account_active"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_deposit_account_active"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assert_deposit_deactivation_safe"() TO "anon";
GRANT ALL ON FUNCTION "public"."assert_deposit_deactivation_safe"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_deposit_deactivation_safe"() TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_client"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_client"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_client"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_contract"("p_contract_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_contract"("p_contract_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_contract"("p_contract_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_to_stage" "text", "p_user_id" "uuid", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_to_stage" "text", "p_user_id" "uuid", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."change_contract_stage"("p_contract_id" "uuid", "p_to_stage" "text", "p_user_id" "uuid", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_client_hierarchy"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_client_hierarchy"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_client_hierarchy"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_contract_with_details"("p_input" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_contract_with_details"("p_input" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_contract_with_details"("p_input" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_client_id"("p_type" "public"."client_type") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_client_id"("p_type" "public"."client_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_client_id"("p_type" "public"."client_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_edu_contract_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_edu_contract_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_edu_contract_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_msp_contract_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_msp_contract_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_msp_contract_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_contract_delete_with_deposit"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_contract_delete_with_deposit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_contract_delete_with_deposit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."immutable_array_to_string"("arr" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."immutable_array_to_string"("arr" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."immutable_array_to_string"("arr" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_clevel_or_lead"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_clevel_or_lead"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_clevel_or_lead"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_clevel"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_clevel"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_clevel"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_deposit_account_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_deposit_account_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_deposit_account_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."replace_contract_tech_leads"("p_contract_id" "uuid", "p_employee_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."replace_contract_tech_leads"("p_contract_id" "uuid", "p_employee_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace_contract_tech_leads"("p_contract_id" "uuid", "p_employee_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_client"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_client"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_client"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_contract"("p_contract_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_contract"("p_contract_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_contract"("p_contract_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_contract_teams"("p_contract_id" "uuid", "p_allocations" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_contract_teams"("p_contract_id" "uuid", "p_allocations" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_contract_teams"("p_contract_id" "uuid", "p_allocations" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_team_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."user_team_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_team_id"() TO "service_role";



GRANT ALL ON TABLE "public"."client_edu_details" TO "anon";
GRANT ALL ON TABLE "public"."client_edu_details" TO "authenticated";
GRANT ALL ON TABLE "public"."client_edu_details" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."contracts" TO "anon";
GRANT ALL ON TABLE "public"."contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts" TO "service_role";



GRANT ALL ON TABLE "public"."client_list_view" TO "anon";
GRANT ALL ON TABLE "public"."client_list_view" TO "authenticated";
GRANT ALL ON TABLE "public"."client_list_view" TO "service_role";



GRANT ALL ON TABLE "public"."client_msp_details" TO "anon";
GRANT ALL ON TABLE "public"."client_msp_details" TO "authenticated";
GRANT ALL ON TABLE "public"."client_msp_details" TO "service_role";



GRANT ALL ON TABLE "public"."contacts" TO "anon";
GRANT ALL ON TABLE "public"."contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."contacts" TO "service_role";



GRANT ALL ON TABLE "public"."contract_history" TO "anon";
GRANT ALL ON TABLE "public"."contract_history" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_history" TO "service_role";



GRANT ALL ON TABLE "public"."contract_msp_details" TO "anon";
GRANT ALL ON TABLE "public"."contract_msp_details" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_msp_details" TO "service_role";



GRANT ALL ON TABLE "public"."contract_teams" TO "anon";
GRANT ALL ON TABLE "public"."contract_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_teams" TO "service_role";



GRANT ALL ON TABLE "public"."contract_tech_leads" TO "anon";
GRANT ALL ON TABLE "public"."contract_tech_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."contract_tech_leads" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."contracts_with_details" TO "anon";
GRANT ALL ON TABLE "public"."contracts_with_details" TO "authenticated";
GRANT ALL ON TABLE "public"."contracts_with_details" TO "service_role";



GRANT ALL ON TABLE "public"."deposit_accounts" TO "anon";
GRANT ALL ON TABLE "public"."deposit_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."deposit_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."deposit_transactions" TO "anon";
GRANT ALL ON TABLE "public"."deposit_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."deposit_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."education_operation_dates" TO "anon";
GRANT ALL ON TABLE "public"."education_operation_dates" TO "authenticated";
GRANT ALL ON TABLE "public"."education_operation_dates" TO "service_role";



GRANT ALL ON TABLE "public"."education_operations" TO "anon";
GRANT ALL ON TABLE "public"."education_operations" TO "authenticated";
GRANT ALL ON TABLE "public"."education_operations" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."instructors" TO "anon";
GRANT ALL ON TABLE "public"."instructors" TO "authenticated";
GRANT ALL ON TABLE "public"."instructors" TO "service_role";



GRANT ALL ON TABLE "public"."operation_instructors" TO "anon";
GRANT ALL ON TABLE "public"."operation_instructors" TO "authenticated";
GRANT ALL ON TABLE "public"."operation_instructors" TO "service_role";



GRANT ALL ON TABLE "public"."team_business_domains" TO "anon";
GRANT ALL ON TABLE "public"."team_business_domains" TO "authenticated";
GRANT ALL ON TABLE "public"."team_business_domains" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







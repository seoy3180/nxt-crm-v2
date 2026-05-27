-- ============================================================
-- NXT CRM v2 — Staging 환경 초기 스키마 (운영 schema MCP 추출본)
-- 생성: 2026-05-15
-- 사용:
--   https://supabase.com/dashboard/project/afydtaxmuwjdhmdwgemy/sql/new
--   에 전체 paste → Run
-- ============================================================

-- 1) 필수 확장
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2) ENUM 타입 (16개)
-- ============================================================

CREATE TYPE billing_method_type AS ENUM ('대표님 직접 청구', '매월 10일 세금계산서 발행', '공공기관 별도 청구');
CREATE TYPE business_type AS ENUM ('msp', 'edu', 'dev');
CREATE TYPE client_grade AS ENUM ('A', 'B', 'C', 'D', 'E');
CREATE TYPE client_status_type AS ENUM ('신규', '진행중', '활성', '휴면', '종료', '상태없음');
CREATE TYPE client_type AS ENUM ('univ', 'corp', 'govt', 'asso', 'etc');
CREATE TYPE company_size_type AS ENUM ('스타트업', '중소기업', '중견기업', '대기업', '공공기관');
CREATE TYPE contract_type AS ENUM ('msp', 'edu', 'dev');
CREATE TYPE credit_share_type AS ENUM ('가능', '불가능', '미정');
CREATE TYPE currency_type AS ENUM ('KRW', 'USD');
CREATE TYPE deposit_txn_source AS ENUM ('manual', 'aws_api', 'billing_on');
CREATE TYPE deposit_txn_type AS ENUM ('deposit', 'usage', 'adjustment', 'refund');
CREATE TYPE industry_type AS ENUM ('IT', '제조', '금융', '유통', '공공', '서울대 연구실', '기타');
CREATE TYPE msp_grade_type AS ENUM ('None', 'FREE', 'MSP10', 'MSP15', 'MSP20', 'ETC');
CREATE TYPE payer_type AS ENUM ('ETV-AWS-13', 'ETV-AWS-14', 'Org-001', 'Billing Transfer');
CREATE TYPE team_type AS ENUM ('msp', 'tt', 'dev', 'ops', 'ai', 'ptn');
CREATE TYPE user_role AS ENUM ('staff', 'team_lead', 'admin', 'c_level');

-- ============================================================
-- 3) TABLE 정의 (19개)
-- ============================================================

CREATE TABLE teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type team_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 00031과 동기화: 팀 ↔ 비즈니스 도메인 매핑 (M:N, 접근 제어용)
CREATE TABLE team_business_domains (
  team_type     team_type     NOT NULL,
  business_type business_type NOT NULL,
  PRIMARY KEY (team_type, business_type)
);
ALTER TABLE team_business_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY team_business_domains_select ON team_business_domains
  FOR SELECT USING (auth.uid() IS NOT NULL);
INSERT INTO team_business_domains (team_type, business_type) VALUES
  ('ops'::team_type, 'edu'::business_type),
  ('ops'::team_type, 'msp'::business_type),
  ('tt'::team_type,  'edu'::business_type),
  ('dev'::team_type, 'dev'::business_type),
  ('ai'::team_type,  'msp'::business_type),
  ('ptn'::team_type, 'msp'::business_type);

CREATE TABLE profiles (
  id uuid NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  role user_role NOT NULL DEFAULT 'staff'::user_role,
  team_id uuid,
  "position" text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  team_id uuid,
  "position" text,
  profile_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  is_sales_rep boolean NOT NULL DEFAULT false
);

CREATE TABLE clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  name text NOT NULL,
  client_type client_type NOT NULL,
  grade client_grade,
  business_types business_type[] DEFAULT '{}'::business_type[],
  parent_id uuid,
  status client_status_type NOT NULL DEFAULT '상태없음'::client_status_type,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE client_msp_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  industry industry_type,
  company_size company_size_type,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE client_edu_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  edu_grade text,
  memo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  department text,
  "position" text,
  role text,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id text NOT NULL,
  client_id uuid NOT NULL,
  type contract_type NOT NULL,
  name text NOT NULL,
  memo text,
  total_amount bigint DEFAULT 0,
  currency currency_type DEFAULT 'KRW'::currency_type,
  stage text,
  assigned_to uuid,
  contact_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE contract_msp_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  credit_share credit_share_type,
  expected_mrr bigint,
  payer payer_type,
  aws_amount bigint,
  has_management_fee boolean DEFAULT false,
  billing_method billing_method_type,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sales_rep_id uuid,
  aws_account_ids text[] DEFAULT '{}'::text[],
  aws_am text,
  msp_grade msp_grade_type,
  billing_on boolean NOT NULL DEFAULT false,
  billing_on_alias text,
  deleted_at timestamptz,
  tags text[] DEFAULT '{}'::text[],
  root_account_email text
);

CREATE TABLE contract_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  team_id uuid NOT NULL,
  percentage numeric(5,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE contract_tech_leads (
  contract_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE contract_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  from_stage text,
  to_stage text,
  changed_by uuid NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  field_name text DEFAULT 'stage'::text,
  old_value text,
  new_value text
);

CREATE TABLE education_operations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  operation_name text NOT NULL,
  location text,
  target_org text,
  start_date date,
  end_date date,
  total_hours numeric(6,1),
  contracted_count integer,
  recruited_count integer,
  actual_count integer,
  provides_lunch boolean DEFAULT false,
  provides_snack boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  notes text,
  date_list date[] DEFAULT '{}'::date[]
);

CREATE TABLE education_operation_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL,
  education_date date NOT NULL,
  hours numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE instructors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  organization text,
  team text,
  "position" text,
  status text DEFAULT '활동'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE operation_instructors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL,
  instructor_id uuid NOT NULL,
  role text NOT NULL,
  assigned_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE TABLE deposit_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL,
  balance bigint NOT NULL DEFAULT 0,
  total_deposit bigint NOT NULL DEFAULT 0,
  total_usage bigint NOT NULL DEFAULT 0,
  last_recalc_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE deposit_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  txn_date date NOT NULL,
  txn_type deposit_txn_type NOT NULL,
  amount bigint NOT NULL,
  memo text,
  source deposit_txn_source NOT NULL DEFAULT 'manual'::deposit_txn_source,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  voided_at timestamptz,
  voided_by uuid,
  void_reason text
);

CREATE TABLE user_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4) PRIMARY KEY / UNIQUE / CHECK 제약
-- ============================================================

ALTER TABLE client_edu_details ADD CONSTRAINT client_edu_details_pkey PRIMARY KEY (id);
ALTER TABLE client_msp_details ADD CONSTRAINT client_msp_details_pkey PRIMARY KEY (id);
ALTER TABLE clients ADD CONSTRAINT clients_pkey PRIMARY KEY (id);
ALTER TABLE contacts ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);
ALTER TABLE contract_history ADD CONSTRAINT contract_history_pkey PRIMARY KEY (id);
ALTER TABLE contract_msp_details ADD CONSTRAINT contract_msp_details_pkey PRIMARY KEY (id);
ALTER TABLE contract_teams ADD CONSTRAINT contract_teams_pkey PRIMARY KEY (id);
ALTER TABLE contract_tech_leads ADD CONSTRAINT contract_tech_leads_pkey PRIMARY KEY (contract_id, employee_id);
ALTER TABLE contracts ADD CONSTRAINT contracts_pkey PRIMARY KEY (id);
ALTER TABLE deposit_accounts ADD CONSTRAINT deposit_accounts_pkey PRIMARY KEY (id);
ALTER TABLE deposit_transactions ADD CONSTRAINT deposit_transactions_pkey PRIMARY KEY (id);
ALTER TABLE education_operation_dates ADD CONSTRAINT education_operation_dates_pkey PRIMARY KEY (id);
ALTER TABLE education_operations ADD CONSTRAINT education_operations_pkey PRIMARY KEY (id);
ALTER TABLE employees ADD CONSTRAINT staff_pkey PRIMARY KEY (id);
ALTER TABLE instructors ADD CONSTRAINT instructors_pkey PRIMARY KEY (id);
ALTER TABLE operation_instructors ADD CONSTRAINT operation_instructors_pkey PRIMARY KEY (id);
ALTER TABLE profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
ALTER TABLE teams ADD CONSTRAINT teams_pkey PRIMARY KEY (id);
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);

ALTER TABLE client_edu_details ADD CONSTRAINT client_edu_details_client_id_key UNIQUE (client_id);
ALTER TABLE client_msp_details ADD CONSTRAINT client_msp_details_client_id_key UNIQUE (client_id);
ALTER TABLE clients ADD CONSTRAINT clients_client_id_key UNIQUE (client_id);
ALTER TABLE contract_msp_details ADD CONSTRAINT contract_msp_details_contract_id_key UNIQUE (contract_id);
ALTER TABLE contract_teams ADD CONSTRAINT contract_teams_contract_id_team_id_key UNIQUE (contract_id, team_id);
ALTER TABLE contracts ADD CONSTRAINT contracts_contract_id_key UNIQUE (contract_id);
-- 00027과 동기화: 전역 UNIQUE 대신 활성 row 한정 부분 unique index
CREATE UNIQUE INDEX IF NOT EXISTS deposit_accounts_contract_id_active_unique
  ON deposit_accounts (contract_id) WHERE deleted_at IS NULL;
ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
ALTER TABLE teams ADD CONSTRAINT teams_name_key UNIQUE (name);
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);

ALTER TABLE contract_teams ADD CONSTRAINT contract_teams_percentage_check CHECK (((percentage > (0)::numeric) AND (percentage <= (100)::numeric)));
ALTER TABLE contracts ADD CONSTRAINT contracts_stage_check CHECK (((stage IS NULL) OR ((type = 'msp'::contract_type) AND (stage = ANY (ARRAY['pre_contract'::text, 'billing_complete'::text, 'project_closed'::text, 'unpaid'::text]))) OR ((type = 'tt'::contract_type) AND (stage = ANY (ARRAY['proposal'::text, 'contracted'::text, 'operating'::text, 'op_completed'::text, 'settled'::text]))) OR (type = 'dev'::contract_type)));
ALTER TABLE deposit_transactions ADD CONSTRAINT amount_sign_check CHECK ((((txn_type = ANY (ARRAY['deposit'::deposit_txn_type, 'usage'::deposit_txn_type, 'refund'::deposit_txn_type])) AND (amount > 0)) OR ((txn_type = 'adjustment'::deposit_txn_type) AND (amount <> 0))));

-- ============================================================
-- 5) FUNCTION (14개)
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.check_client_hierarchy()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM clients WHERE id = NEW.parent_id AND parent_id IS NOT NULL) THEN
      RAISE EXCEPTION '고객 계층은 2단계까지만 가능합니다';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.user_team_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_clevel()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.user_role() IN ('admin'::user_role, 'c_level'::user_role);
$$;

-- 00029와 동기화: 예치금 권한 확장용 헬퍼
CREATE OR REPLACE FUNCTION public.is_admin_clevel_or_lead()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  RETURN public.is_admin_or_clevel()
      OR public.user_role() = 'team_lead'::user_role;
END $$;

CREATE OR REPLACE FUNCTION public.can_access_client(p_client_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF public.is_admin_or_clevel() THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM contracts c
    JOIN contract_teams ct ON ct.contract_id = c.id
    WHERE c.client_id = p_client_id
      AND ct.team_id = public.user_team_id()
      AND c.deleted_at IS NULL
      AND ct.deleted_at IS NULL
  );
END; $$;

-- 00031과 동기화: team_business_domains 매핑 기반 + contract_teams fallback
CREATE OR REPLACE FUNCTION public.can_access_contract(p_contract_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_team_type     team_type;
  v_contract_type contract_type;
BEGIN
  IF public.is_admin_or_clevel() THEN RETURN TRUE; END IF;

  SELECT t.type INTO v_team_type FROM teams t WHERE t.id = public.user_team_id();
  IF v_team_type IS NULL THEN RETURN FALSE; END IF;

  SELECT type INTO v_contract_type FROM contracts WHERE id = p_contract_id;
  IF v_contract_type IS NULL THEN RETURN FALSE; END IF;

  IF EXISTS (
    SELECT 1 FROM team_business_domains d
    WHERE d.team_type = v_team_type
      AND d.business_type::text = v_contract_type::text
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM contract_teams
    WHERE contract_id = p_contract_id
      AND team_id = public.user_team_id()
      AND deleted_at IS NULL
  );
END; $$;

CREATE OR REPLACE FUNCTION public.generate_client_id(p_type client_type)
RETURNS text LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE prefix TEXT; seq INT;
BEGIN
  CASE p_type
    WHEN 'univ' THEN prefix := 'UNIV';
    WHEN 'corp' THEN prefix := 'CORP';
    WHEN 'govt' THEN prefix := 'GOVT';
    WHEN 'asso' THEN prefix := 'ASSO';
    WHEN 'etc' THEN prefix := 'ETC';
  END CASE;
  SELECT COALESCE(MAX(CAST(SUBSTRING(client_id FROM LENGTH(prefix) + 2) AS INT)), 0) + 1
    INTO seq FROM clients WHERE client_id LIKE prefix || '-%';
  RETURN prefix || '-' || LPAD(seq::TEXT, 3, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.generate_msp_contract_id()
RETURNS text LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_id FROM 5) AS INT)), 0) + 1
    INTO seq FROM contracts WHERE contract_id LIKE 'MSP-%';
  RETURN 'MSP-' || LPAD(seq::TEXT, 3, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.generate_edu_contract_id()
RETURNS text LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE yr TEXT; seq INT;
BEGIN
  yr := EXTRACT(YEAR FROM now())::TEXT;
  SELECT COALESCE(MAX(CAST(SUBSTRING(contract_id FROM 7) AS INT)), 0) + 1
    INTO seq FROM contracts WHERE contract_id LIKE 'CT' || yr || '%';
  RETURN 'CT' || yr || LPAD(seq::TEXT, 3, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.update_contract_teams(p_contract_id uuid, p_allocations jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM contract_teams WHERE contract_id = p_contract_id;
  IF jsonb_array_length(p_allocations) > 0 THEN
    INSERT INTO contract_teams (contract_id, team_id, percentage)
    SELECT p_contract_id, (elem->>'team_id')::uuid, (elem->>'percentage')::numeric
    FROM jsonb_array_elements(p_allocations) AS elem;
  END IF;
END; $$;

-- 00030과 동기화: 비활성화 = 잔액 0 + admin·c_level·team_lead 전용
CREATE OR REPLACE FUNCTION public.assert_deposit_deactivation_safe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    IF NOT public.is_admin_clevel_or_lead() THEN
      RAISE EXCEPTION '예치금 계좌 비활성화 권한이 없습니다 (admin·c_level·team_lead 전용, account_id=%)',
        NEW.id USING ERRCODE = 'insufficient_privilege';
    END IF;
    IF NEW.balance <> 0 THEN
      RAISE EXCEPTION '잔액이 0이 아닌 예치금 계좌는 비활성화할 수 없습니다 (잔액=%, account_id=%)',
        NEW.balance, NEW.id USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 00026과 동기화: 비활성 계좌에 거래 INSERT/UPDATE 차단 (void만 허용)
CREATE OR REPLACE FUNCTION public.assert_deposit_account_active()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_deleted_at timestamptz;
BEGIN
  SELECT deleted_at INTO v_deleted_at FROM deposit_accounts WHERE id = NEW.account_id;
  IF v_deleted_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.voided_at IS NULL AND NEW.voided_at IS NOT NULL
     AND NEW.amount = OLD.amount AND NEW.txn_type = OLD.txn_type THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION '비활성화된 예치금 계좌에는 거래를 등록/수정할 수 없습니다 (account_id=%)', NEW.account_id
    USING ERRCODE = 'check_violation';
END $$;

CREATE OR REPLACE FUNCTION public.recalc_deposit_account_balance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  target_account_id uuid;
  v_total_deposit bigint; v_total_usage bigint;
  v_total_adjustment bigint; v_total_refund bigint;
BEGIN
  target_account_id := COALESCE(NEW.account_id, OLD.account_id);
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposit FROM deposit_transactions
    WHERE account_id = target_account_id AND txn_type = 'deposit'::deposit_txn_type AND voided_at IS NULL;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_usage FROM deposit_transactions
    WHERE account_id = target_account_id AND txn_type = 'usage'::deposit_txn_type AND voided_at IS NULL;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_adjustment FROM deposit_transactions
    WHERE account_id = target_account_id AND txn_type = 'adjustment'::deposit_txn_type AND voided_at IS NULL;
  SELECT COALESCE(SUM(amount), 0) INTO v_total_refund FROM deposit_transactions
    WHERE account_id = target_account_id AND txn_type = 'refund'::deposit_txn_type AND voided_at IS NULL;
  UPDATE deposit_accounts SET
    total_deposit = v_total_deposit, total_usage = v_total_usage,
    balance = v_total_deposit - v_total_usage + v_total_adjustment - v_total_refund,
    last_recalc_at = now(), updated_at = now()
   WHERE id = target_account_id;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.guard_contract_delete_with_deposit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF EXISTS (SELECT 1 FROM deposit_accounts WHERE contract_id = NEW.id AND deleted_at IS NULL AND balance <> 0) THEN
      RAISE EXCEPTION 'DEPOSIT_BALANCE_NOT_ZERO'
        USING HINT = '예치금 잔액이 남아있어 계약을 종료할 수 없습니다. 환불(refund) 후 다시 시도하세요.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- ============================================================
-- 6) INDEX (23개)
-- ============================================================

CREATE INDEX idx_clients_active ON public.clients USING btree (id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_clients_name_trgm ON public.clients USING gin (name gin_trgm_ops);
CREATE INDEX idx_clients_parent ON public.clients USING btree (parent_id) WHERE (parent_id IS NOT NULL);
CREATE INDEX idx_contacts_active ON public.contacts USING btree (id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_contacts_client ON public.contacts USING btree (client_id);
CREATE INDEX idx_contacts_name_trgm ON public.contacts USING gin (name gin_trgm_ops);
CREATE INDEX idx_contract_history_contract ON public.contract_history USING btree (contract_id);
CREATE INDEX idx_contract_teams_contract ON public.contract_teams USING btree (contract_id);
CREATE INDEX idx_contract_teams_team ON public.contract_teams USING btree (team_id);
CREATE INDEX idx_contract_tech_leads_employee ON public.contract_tech_leads USING btree (employee_id);
CREATE INDEX idx_contracts_active ON public.contracts USING btree (id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_contracts_client ON public.contracts USING btree (client_id);
CREATE INDEX idx_contracts_name_trgm ON public.contracts USING gin (name gin_trgm_ops);
CREATE INDEX idx_contracts_stage ON public.contracts USING btree (stage);
CREATE INDEX idx_contracts_type ON public.contracts USING btree (type);
CREATE INDEX idx_deposit_accounts_contract ON public.deposit_accounts USING btree (contract_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_deposit_txn_account_date ON public.deposit_transactions USING btree (account_id, txn_date DESC) WHERE (voided_at IS NULL);
CREATE INDEX idx_deposit_txn_active ON public.deposit_transactions USING btree (account_id) WHERE (voided_at IS NULL);
CREATE INDEX idx_edu_op_dates_operation_id ON public.education_operation_dates USING btree (operation_id);
CREATE INDEX idx_education_ops_contract ON public.education_operations USING btree (contract_id);
CREATE INDEX idx_employees_team_id ON public.employees USING btree (team_id);
CREATE INDEX idx_operation_instructors_ins ON public.operation_instructors USING btree (instructor_id);
CREATE INDEX idx_operation_instructors_op ON public.operation_instructors USING btree (operation_id);

-- ============================================================
-- 7) FOREIGN KEY (테이블 모두 만들어진 후)
-- ============================================================

ALTER TABLE client_edu_details ADD CONSTRAINT client_edu_details_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE client_msp_details ADD CONSTRAINT client_msp_details_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE clients ADD CONSTRAINT clients_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD CONSTRAINT contacts_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;
ALTER TABLE contract_history ADD CONSTRAINT contract_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES profiles(id);
ALTER TABLE contract_history ADD CONSTRAINT contract_history_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE contract_msp_details ADD CONSTRAINT contract_msp_details_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE contract_msp_details ADD CONSTRAINT contract_msp_details_sales_rep_id_fkey FOREIGN KEY (sales_rep_id) REFERENCES employees(id);
ALTER TABLE contract_teams ADD CONSTRAINT contract_teams_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE contract_teams ADD CONSTRAINT contract_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id);
ALTER TABLE contract_tech_leads ADD CONSTRAINT contract_tech_leads_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE contract_tech_leads ADD CONSTRAINT contract_tech_leads_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
ALTER TABLE contracts ADD CONSTRAINT contracts_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES profiles(id);
ALTER TABLE contracts ADD CONSTRAINT contracts_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id);
ALTER TABLE contracts ADD CONSTRAINT contracts_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES contacts(id);
ALTER TABLE deposit_accounts ADD CONSTRAINT deposit_accounts_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id);
ALTER TABLE deposit_transactions ADD CONSTRAINT deposit_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES deposit_accounts(id);
ALTER TABLE deposit_transactions ADD CONSTRAINT deposit_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);
ALTER TABLE deposit_transactions ADD CONSTRAINT deposit_transactions_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES profiles(id);
ALTER TABLE education_operation_dates ADD CONSTRAINT education_operation_dates_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES education_operations(id) ON DELETE CASCADE;
ALTER TABLE education_operations ADD CONSTRAINT education_operations_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;
ALTER TABLE employees ADD CONSTRAINT staff_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES profiles(id);
ALTER TABLE employees ADD CONSTRAINT staff_team_id_fkey FOREIGN KEY (team_id) REFERENCES teams(id);
ALTER TABLE operation_instructors ADD CONSTRAINT operation_instructors_instructor_id_fkey FOREIGN KEY (instructor_id) REFERENCES instructors(id);
ALTER TABLE operation_instructors ADD CONSTRAINT operation_instructors_operation_id_fkey FOREIGN KEY (operation_id) REFERENCES education_operations(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD CONSTRAINT profiles_team_id_fk FOREIGN KEY (team_id) REFERENCES teams(id);
ALTER TABLE user_preferences ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- ============================================================
-- 8) TRIGGER (16개)
-- ============================================================

CREATE TRIGGER client_edu_details_updated_at BEFORE UPDATE ON public.client_edu_details FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER client_msp_details_updated_at BEFORE UPDATE ON public.client_msp_details FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clients_hierarchy_check BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION check_client_hierarchy();
CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contract_msp_details_updated_at BEFORE UPDATE ON public.contract_msp_details FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contract_teams_updated_at BEFORE UPDATE ON public.contract_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contract_delete_guard BEFORE UPDATE OF deleted_at ON public.contracts FOR EACH ROW EXECUTE FUNCTION guard_contract_delete_with_deposit();
CREATE TRIGGER deposit_accounts_updated_at BEFORE UPDATE ON public.deposit_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_assert_deposit_deactivation_safe BEFORE UPDATE OF deleted_at ON public.deposit_accounts FOR EACH ROW EXECUTE FUNCTION assert_deposit_deactivation_safe();
CREATE TRIGGER trg_deposit_txn_recalc AFTER INSERT OR DELETE OR UPDATE OF amount, voided_at, txn_type ON public.deposit_transactions FOR EACH ROW EXECUTE FUNCTION recalc_deposit_account_balance();
CREATE TRIGGER trg_assert_active_account BEFORE INSERT OR UPDATE OF amount, txn_type, voided_at ON public.deposit_transactions FOR EACH ROW EXECUTE FUNCTION assert_deposit_account_active();
CREATE TRIGGER education_operations_updated_at BEFORE UPDATE ON public.education_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER instructors_updated_at BEFORE UPDATE ON public.instructors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- auth.users 트리거 (handle_new_user) — Supabase가 기본 셋업하지만 신규 프로젝트에 명시 적용
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 9) VIEW (2개)
-- ============================================================

CREATE OR REPLACE VIEW client_list_view AS
SELECT c.id, c.client_id, c.name, c.client_type, c.grade, c.business_types, c.parent_id,
       c.status, c.memo, c.created_at, c.updated_at, c.deleted_at,
       (SELECT count(*) FROM contracts ct WHERE ct.client_id = c.id AND ct.deleted_at IS NULL) AS contract_count
FROM clients c
WHERE c.deleted_at IS NULL;

CREATE OR REPLACE VIEW contracts_with_details AS
SELECT c.id, c.contract_id, c.client_id, c.type, c.name, c.memo, c.total_amount, c.currency,
       c.stage, c.assigned_to, c.contact_id, c.created_at, c.updated_at, c.deleted_at,
       msp.credit_share, msp.expected_mrr, msp.payer, msp.sales_rep_id, msp.aws_amount,
       msp.has_management_fee, msp.billing_method, msp.aws_account_ids, msp.aws_am,
       msp.msp_grade, msp.billing_on,
       cl.name AS client_name, cl.client_id AS client_display_id,
       p.name AS assigned_to_name
FROM contracts c
LEFT JOIN contract_msp_details msp ON msp.contract_id = c.id
LEFT JOIN clients cl ON cl.id = c.client_id
LEFT JOIN profiles p ON p.id = c.assigned_to
WHERE c.deleted_at IS NULL;

-- ============================================================
-- 10) ENABLE RLS + POLICIES
-- ============================================================

ALTER TABLE public.client_edu_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_msp_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_msp_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_tech_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_operation_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operation_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY client_edu_insert ON client_edu_details FOR INSERT WITH CHECK (can_access_client(client_id));
CREATE POLICY client_edu_select ON client_edu_details FOR SELECT USING (can_access_client(client_id));
CREATE POLICY client_edu_update ON client_edu_details FOR UPDATE USING (can_access_client(client_id));

CREATE POLICY client_msp_insert ON client_msp_details FOR INSERT WITH CHECK (can_access_client(client_id));
CREATE POLICY client_msp_select ON client_msp_details FOR SELECT USING (can_access_client(client_id));
CREATE POLICY client_msp_update ON client_msp_details FOR UPDATE USING (can_access_client(client_id));

CREATE POLICY clients_delete ON clients FOR DELETE USING (can_access_client(id));
CREATE POLICY clients_insert ON clients FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY clients_select ON clients FOR SELECT USING (can_access_client(id));
CREATE POLICY clients_update ON clients FOR UPDATE USING (can_access_client(id));

CREATE POLICY contacts_delete ON contacts FOR DELETE USING (can_access_client(client_id));
CREATE POLICY contacts_insert ON contacts FOR INSERT WITH CHECK (can_access_client(client_id));
CREATE POLICY contacts_select ON contacts FOR SELECT USING (can_access_client(client_id));
CREATE POLICY contacts_update ON contacts FOR UPDATE USING (can_access_client(client_id));

CREATE POLICY contract_teams_insert ON contract_teams FOR INSERT WITH CHECK (can_access_contract(contract_id));
CREATE POLICY contract_teams_select ON contract_teams FOR SELECT USING (can_access_contract(contract_id));
CREATE POLICY contract_teams_update ON contract_teams FOR UPDATE USING (can_access_contract(contract_id));

CREATE POLICY contract_tech_leads_delete ON contract_tech_leads FOR DELETE USING (can_access_contract(contract_id));
CREATE POLICY contract_tech_leads_insert ON contract_tech_leads FOR INSERT WITH CHECK (can_access_contract(contract_id));
CREATE POLICY contract_tech_leads_select ON contract_tech_leads FOR SELECT USING (can_access_contract(contract_id));

CREATE POLICY contracts_delete ON contracts FOR DELETE USING (can_access_contract(id));
CREATE POLICY contracts_insert ON contracts FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY contracts_select ON contracts FOR SELECT USING (can_access_contract(id));
CREATE POLICY contracts_update ON contracts FOR UPDATE USING (can_access_contract(id));

CREATE POLICY deposit_accounts_insert ON deposit_accounts FOR INSERT
  WITH CHECK ((can_access_contract(contract_id) AND (EXISTS (
    SELECT 1 FROM contracts c WHERE c.id = deposit_accounts.contract_id AND c.type = 'msp'::contract_type))));
CREATE POLICY deposit_accounts_select ON deposit_accounts FOR SELECT
  USING ((can_access_contract(contract_id) AND (EXISTS (
    SELECT 1 FROM contracts c WHERE c.id = deposit_accounts.contract_id AND c.type = 'msp'::contract_type AND c.deleted_at IS NULL))));
CREATE POLICY deposit_accounts_update ON deposit_accounts FOR UPDATE USING (can_access_contract(contract_id));

-- 00029와 동기화: adjustment/refund INSERT 허용을 team_lead까지 확장
CREATE POLICY deposit_txn_insert ON deposit_transactions FOR INSERT
  WITH CHECK (((EXISTS (
    SELECT 1 FROM deposit_accounts a WHERE a.id = deposit_transactions.account_id AND can_access_contract(a.contract_id)))
    AND ((txn_type = ANY (ARRAY['deposit'::deposit_txn_type, 'usage'::deposit_txn_type])) OR is_admin_clevel_or_lead())));
CREATE POLICY deposit_txn_select ON deposit_transactions FOR SELECT
  USING ((EXISTS (
    SELECT 1 FROM deposit_accounts a WHERE a.id = deposit_transactions.account_id AND can_access_contract(a.contract_id))));
-- 00029와 동기화: void 권한을 team_lead까지 확장
CREATE POLICY deposit_txn_update ON deposit_transactions FOR UPDATE
  USING (((created_by = auth.uid()) OR is_admin_clevel_or_lead()));

CREATE POLICY edu_op_dates_delete ON education_operation_dates FOR DELETE USING ((auth.uid() IS NOT NULL));
CREATE POLICY edu_op_dates_insert ON education_operation_dates FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY edu_op_dates_select ON education_operation_dates FOR SELECT USING (true);
CREATE POLICY edu_op_dates_update ON education_operation_dates FOR UPDATE USING ((auth.uid() IS NOT NULL));

CREATE POLICY edu_ops_delete ON education_operations FOR DELETE USING (can_access_contract(contract_id));
CREATE POLICY edu_ops_insert ON education_operations FOR INSERT WITH CHECK (can_access_contract(contract_id));
CREATE POLICY edu_ops_select ON education_operations FOR SELECT USING (can_access_contract(contract_id));
CREATE POLICY edu_ops_update ON education_operations FOR UPDATE USING (can_access_contract(contract_id));

CREATE POLICY history_insert ON contract_history FOR INSERT WITH CHECK (can_access_contract(contract_id));
CREATE POLICY history_select ON contract_history FOR SELECT USING (can_access_contract(contract_id));

CREATE POLICY instructors_insert ON instructors FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY instructors_select ON instructors FOR SELECT USING (true);
CREATE POLICY instructors_update ON instructors FOR UPDATE USING ((auth.uid() IS NOT NULL));

CREATE POLICY msp_details_insert ON contract_msp_details FOR INSERT WITH CHECK (can_access_contract(contract_id));
CREATE POLICY msp_details_select ON contract_msp_details FOR SELECT USING (can_access_contract(contract_id));
CREATE POLICY msp_details_update ON contract_msp_details FOR UPDATE USING (can_access_contract(contract_id));

CREATE POLICY op_instructors_delete ON operation_instructors FOR DELETE
  USING ((EXISTS (SELECT 1 FROM education_operations eo WHERE eo.id = operation_instructors.operation_id AND can_access_contract(eo.contract_id))));
CREATE POLICY op_instructors_insert ON operation_instructors FOR INSERT
  WITH CHECK ((EXISTS (SELECT 1 FROM education_operations eo WHERE eo.id = operation_instructors.operation_id AND can_access_contract(eo.contract_id))));
CREATE POLICY op_instructors_select ON operation_instructors FOR SELECT
  USING ((EXISTS (SELECT 1 FROM education_operations eo WHERE eo.id = operation_instructors.operation_id AND can_access_contract(eo.contract_id))));
CREATE POLICY op_instructors_update ON operation_instructors FOR UPDATE
  USING ((EXISTS (SELECT 1 FROM education_operations eo WHERE eo.id = operation_instructors.operation_id AND can_access_contract(eo.contract_id))));

CREATE POLICY prefs_insert ON user_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));
CREATE POLICY prefs_select ON user_preferences FOR SELECT USING ((user_id = auth.uid()));
CREATE POLICY prefs_update ON user_preferences FOR UPDATE USING ((user_id = auth.uid()));

CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING ((id = auth.uid()));

CREATE POLICY staff_delete ON employees FOR DELETE USING ((auth.uid() IS NOT NULL));
CREATE POLICY staff_insert ON employees FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));
CREATE POLICY staff_select ON employees FOR SELECT USING (true);
CREATE POLICY staff_update ON employees FOR UPDATE USING ((auth.uid() IS NOT NULL));

CREATE POLICY teams_select ON teams FOR SELECT USING (true);

-- Staging 초기화 (이전 청크 SQL 잔여 객체 정리)
-- 사용: staging-init-v2.sql 실행 전에 한 번 Run

-- 1) View
DROP VIEW IF EXISTS public.contracts_with_details CASCADE;
DROP VIEW IF EXISTS public.client_list_view CASCADE;

-- 2) Table (CASCADE로 trigger/policy/FK 같이 정리)
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.deposit_transactions CASCADE;
DROP TABLE IF EXISTS public.deposit_accounts CASCADE;
DROP TABLE IF EXISTS public.operation_instructors CASCADE;
DROP TABLE IF EXISTS public.education_operation_dates CASCADE;
DROP TABLE IF EXISTS public.education_operations CASCADE;
DROP TABLE IF EXISTS public.instructors CASCADE;
DROP TABLE IF EXISTS public.contract_history CASCADE;
DROP TABLE IF EXISTS public.contract_tech_leads CASCADE;
DROP TABLE IF EXISTS public.contract_teams CASCADE;
DROP TABLE IF EXISTS public.contract_msp_details CASCADE;
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.client_edu_details CASCADE;
DROP TABLE IF EXISTS public.client_msp_details CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- 3) Function
DROP FUNCTION IF EXISTS public.guard_contract_delete_with_deposit() CASCADE;
DROP FUNCTION IF EXISTS public.recalc_deposit_account_balance() CASCADE;
DROP FUNCTION IF EXISTS public.update_contract_teams(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.generate_edu_contract_id() CASCADE;
DROP FUNCTION IF EXISTS public.generate_msp_contract_id() CASCADE;
DROP FUNCTION IF EXISTS public.generate_client_id(client_type) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_contract(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_access_client(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin_or_clevel() CASCADE;
DROP FUNCTION IF EXISTS public.user_team_id() CASCADE;
DROP FUNCTION IF EXISTS public.user_role() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.check_client_hierarchy() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at() CASCADE;

-- 4) Type (ENUM)
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.team_type CASCADE;
DROP TYPE IF EXISTS public.payer_type CASCADE;
DROP TYPE IF EXISTS public.msp_grade_type CASCADE;
DROP TYPE IF EXISTS public.industry_type CASCADE;
DROP TYPE IF EXISTS public.deposit_txn_type CASCADE;
DROP TYPE IF EXISTS public.deposit_txn_source CASCADE;
DROP TYPE IF EXISTS public.currency_type CASCADE;
DROP TYPE IF EXISTS public.credit_share_type CASCADE;
DROP TYPE IF EXISTS public.contract_type CASCADE;
DROP TYPE IF EXISTS public.company_size_type CASCADE;
DROP TYPE IF EXISTS public.client_type CASCADE;
DROP TYPE IF EXISTS public.client_status_type CASCADE;
DROP TYPE IF EXISTS public.client_grade CASCADE;
DROP TYPE IF EXISTS public.business_type CASCADE;
DROP TYPE IF EXISTS public.billing_method_type CASCADE;

-- auth.users 트리거 (이전에 만들었다면)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 검증 (모두 0이어야 함)
SELECT
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public') AS tables,
  (SELECT COUNT(*) FROM pg_type WHERE typnamespace=(SELECT oid FROM pg_namespace WHERE nspname='public') AND typtype='e') AS enums;

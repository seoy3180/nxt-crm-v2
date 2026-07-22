-- Reset ClickHouse-managed Postgres sync target schema before re-applying
-- supabase/clickhouse_pg_sync_schema.sql.
--
-- Run ONLY on the intended sync target database, e.g. `nxt_crm`.
-- This removes CRM sync objects and P2 PoC leftovers, but intentionally keeps:
-- - public schema
-- - pgcrypto extension

DROP SUBSCRIPTION IF EXISTS supabase_cdc_sub;

DROP TABLE IF EXISTS
  public.client_edu_details,
  public.client_msp_details,
  public.clients,
  public.contacts,
  public.contract_history,
  public.contract_msp_details,
  public.contract_teams,
  public.contract_tech_leads,
  public.contracts,
  public.deposit_accounts,
  public.deposit_transactions,
  public.education_operation_dates,
  public.education_operations,
  public.employees,
  public.instructors,
  public.operation_instructors,
  public.profiles,
  public.team_business_domains,
  public.teams,
  public.user_preferences,
  public.widgets
CASCADE;

DROP FUNCTION IF EXISTS public.immutable_array_to_string(text[]);
DROP FUNCTION IF EXISTS public.current_team_id();
DROP FUNCTION IF EXISTS public.current_user_id();

DROP TYPE IF EXISTS
  public.billing_method_type,
  public.business_type,
  public.client_grade,
  public.client_status_type,
  public.client_type,
  public.company_size_type,
  public.contract_type,
  public.credit_share_type,
  public.currency_type,
  public.deposit_txn_source,
  public.deposit_txn_type,
  public.industry_type,
  public.msp_grade_type,
  public.payer_type,
  public.team_type,
  public.user_role
CASCADE;

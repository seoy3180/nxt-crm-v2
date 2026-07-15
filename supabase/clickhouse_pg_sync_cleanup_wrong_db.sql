-- Cleanup for accidental application of clickhouse_pg_sync_schema.sql
-- to the wrong ClickHouse-managed Postgres database.
--
-- Run ONLY on the wrong target database, e.g. the default `postgres` DB
-- if the sync schema was accidentally applied there.
--
-- Intentionally does NOT drop:
-- - public schema
-- - pgcrypto extension
--
-- If a subscription was also created in this wrong DB, drop it first.

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
  public.user_preferences
CASCADE;

DROP FUNCTION IF EXISTS public.immutable_array_to_string(text[]);

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

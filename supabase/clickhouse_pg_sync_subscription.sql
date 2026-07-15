-- Supabase Postgres -> ClickHouse-managed Postgres subscription template.
--
-- Run this on ClickHouse-managed Postgres after applying:
--   supabase/clickhouse_pg_sync_schema.sql
--
-- Required psql variable:
--   SUPABASE_CONNINFO
--
-- Example:
--   psql "$CLICKHOUSE_PG_ADMIN_URL" \
--     -v ON_ERROR_STOP=1 \
--     -v SUPABASE_CONNINFO="host=db.<project-ref>.supabase.co port=5432 dbname=postgres user=postgres password=<secret> sslmode=require" \
--     -f supabase/clickhouse_pg_sync_subscription.sql
--
-- Do not commit real connection strings or passwords.

DROP SUBSCRIPTION IF EXISTS supabase_cdc_sub;

CREATE SUBSCRIPTION supabase_cdc_sub
CONNECTION :'SUPABASE_CONNINFO'
PUBLICATION supabase_publication
WITH (
  copy_data = true,
  create_slot = true,
  enabled = true
);

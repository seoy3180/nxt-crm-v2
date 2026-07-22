-- ClickHouse-managed Postgres sync target schema
-- Generated from supabase/schema.sql for Supabase -> ClickHouse-managed Postgres logical replication.
-- Purpose: create target enum/table/key structure before CREATE SUBSCRIPTION.
-- Intentionally excludes Supabase Auth/RLS policies, RPC functions, triggers, views, grants, owners, and foreign keys.
-- Source of truth: supabase/schema.sql. Regenerate when source schema changes.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

CREATE SCHEMA IF NOT EXISTS "public";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "public"."billing_method_type" AS ENUM (
    '대표님 직접 청구',
    '매월 10일 세금계산서 발행',
    '공공기관 별도 청구'
);

CREATE TYPE "public"."business_type" AS ENUM (
    'msp',
    'edu',
    'dev'
);

CREATE TYPE "public"."client_grade" AS ENUM (
    'A',
    'B',
    'C',
    'D',
    'E'
);

CREATE TYPE "public"."client_status_type" AS ENUM (
    '신규',
    '진행중',
    '활성',
    '휴면',
    '종료',
    '상태없음'
);

CREATE TYPE "public"."client_type" AS ENUM (
    'univ',
    'corp',
    'govt',
    'asso',
    'etc'
);

CREATE TYPE "public"."company_size_type" AS ENUM (
    '스타트업',
    '중소기업',
    '중견기업',
    '대기업',
    '공공기관'
);

CREATE TYPE "public"."contract_type" AS ENUM (
    'msp',
    'edu',
    'dev'
);

CREATE TYPE "public"."credit_share_type" AS ENUM (
    '가능',
    '불가능',
    '미정'
);

CREATE TYPE "public"."currency_type" AS ENUM (
    'KRW',
    'USD'
);

CREATE TYPE "public"."deposit_txn_source" AS ENUM (
    'manual',
    'aws_api',
    'billing_on'
);

CREATE TYPE "public"."deposit_txn_type" AS ENUM (
    'deposit',
    'usage',
    'adjustment',
    'refund'
);

CREATE TYPE "public"."industry_type" AS ENUM (
    'IT',
    '제조',
    '금융',
    '유통',
    '공공',
    '서울대 연구실',
    '기타'
);

CREATE TYPE "public"."msp_grade_type" AS ENUM (
    'None',
    'FREE',
    'MSP10',
    'MSP15',
    'MSP20',
    'ETC'
);

CREATE TYPE "public"."payer_type" AS ENUM (
    'ETV-AWS-13',
    'ETV-AWS-14',
    'Org-001',
    'Billing Transfer'
);

CREATE TYPE "public"."team_type" AS ENUM (
    'msp',
    'tt',
    'dev',
    'ops',
    'ai',
    'ptn'
);

CREATE TYPE "public"."user_role" AS ENUM (
    'staff',
    'team_lead',
    'admin',
    'c_level'
);

CREATE OR REPLACE FUNCTION "public"."immutable_array_to_string"("arr" "text"[]) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$ SELECT array_to_string(arr, ' '); $$;

CREATE TABLE IF NOT EXISTS "public"."client_edu_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "edu_grade" "text",
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);

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

CREATE TABLE IF NOT EXISTS "public"."contract_tech_leads" (
    "contract_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

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

CREATE TABLE IF NOT EXISTS "public"."education_operation_dates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "education_date" "date" NOT NULL,
    "hours" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

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

CREATE TABLE IF NOT EXISTS "public"."operation_instructors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "operation_id" "uuid" NOT NULL,
    "instructor_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "assigned_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text"
);

CREATE TABLE IF NOT EXISTS "public"."team_business_domains" (
    "team_type" "public"."team_type" NOT NULL,
    "business_type" "public"."business_type" NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "public"."team_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "preferences" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);

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

CREATE UNIQUE INDEX "idx_edu_op_dates_unique" ON "public"."education_operation_dates" USING "btree" ("operation_id", "education_date");

CREATE UNIQUE INDEX "idx_employees_profile_id" ON "public"."employees" USING "btree" ("profile_id") WHERE ("profile_id" IS NOT NULL);


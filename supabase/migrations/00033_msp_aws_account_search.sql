-- 00033: MSP 계약 AWS account ID 검색 (부분 매칭 + 인덱스)
--
-- 배경: aws_account_ids(text[]) element가 "별칭 - 123456789012"처럼 혼합 문자열로
--   저장돼 있어 정확 매칭(@>)으로는 ID 일부만 입력 시 안 걸림.
--   → 배열을 한 줄 텍스트로 합친 generated column + trigram GIN 인덱스로
--     substring 검색을 인덱스 가속.
--
-- 주의: array_to_string은 PostgreSQL에서 STABLE로 분류돼 generated column
--   (IMMUTABLE 요구)에 직접 쓸 수 없음. text[]→text는 실제로는 immutable이므로
--   IMMUTABLE wrapper로 감싼다.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.immutable_array_to_string(arr text[])
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$ SELECT array_to_string(arr, ' '); $$;

ALTER TABLE public.contract_msp_details
  ADD COLUMN IF NOT EXISTS aws_account_search text
  GENERATED ALWAYS AS (public.immutable_array_to_string(aws_account_ids)) STORED;

CREATE INDEX IF NOT EXISTS idx_contract_msp_details_aws_search
  ON public.contract_msp_details USING gin (aws_account_search gin_trgm_ops);

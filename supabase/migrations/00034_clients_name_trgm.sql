-- 00034: clients.name trigram GIN 인덱스
--
-- 목적: 계약 검색에서 고객명 부분 매칭(ilike '%검색어%')을 인덱스로 가속.
--   고객 수 증가 시에도 빠른 검색 보장.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_clients_name_trgm
  ON public.clients USING gin (name gin_trgm_ops);

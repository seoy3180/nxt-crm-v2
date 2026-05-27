-- 00031-A: 팀/비즈니스 도메인 재구성 — enum 변경 (Part A)
--
-- ⚠️ 실행 순서: 이 파일(Part A)을 먼저 Run → 그다음 00031_b를 Run.
--    enum ADD VALUE는 같은 트랜잭션 내 즉시 사용이 막혀 있어 분리 필요.
--
-- 변경:
--   1) 비즈니스 도메인 tt → edu (contract_type, business_type) — 데이터 0건이라 무손실
--   2) team_type: education → tt rename, ops/ai/ptn 추가
--      (msp는 레거시 잔존값 — Phase 2에서 MSP팀 정리 후 미사용. dev 유지)

ALTER TYPE contract_type RENAME VALUE 'tt' TO 'edu';
ALTER TYPE business_type RENAME VALUE 'tt' TO 'edu';

ALTER TYPE team_type RENAME VALUE 'education' TO 'tt';
ALTER TYPE team_type ADD VALUE IF NOT EXISTS 'ops';
ALTER TYPE team_type ADD VALUE IF NOT EXISTS 'ai';
ALTER TYPE team_type ADD VALUE IF NOT EXISTS 'ptn';

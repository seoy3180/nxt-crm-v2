-- 00031-C: 팀 재배치 데이터 (Phase 2) — 한 번만 실행
--
-- ⚠️ 00031_a, 00031_b 적용 후 실행.
-- ⚠️ auth.users 삭제(백종훈)는 SQL 금지 — Supabase Dashboard > Authentication 에서 별도 처리.
--
-- 배치 확정:
--   tt  (Technical Training): 김유림, 이정훈, 김서윤(admin)  — 기존 교육팀 row 유지(type=tt)
--   dev (Development):        권동균, 김진용                 — 기존 개발팀 row 유지(type=dev)
--   ai  (AI & Architecture):  김현민, 김수민                 — 신규 팀
--   ptn (Partnerships):       함동식, 최대근, 손유림          — 신규 팀 (손유림 dev→ptn 이동)
--   ops (Admin & Support):    송다미                         — 신규 팀
--   무소속(c_level):           박진성, 최민철, 이휘원
--   삭제:                      백종훈 (생성 거래/FK 0건)

-- 1) 신규 3팀 INSERT (멱등)
INSERT INTO teams (name, type)
SELECT 'Administration & Support', 'ops'::team_type
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE type = 'ops'::team_type);

INSERT INTO teams (name, type)
SELECT 'AI & Architecture Team', 'ai'::team_type
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE type = 'ai'::team_type);

INSERT INTO teams (name, type)
SELECT 'Partnerships Team', 'ptn'::team_type
WHERE NOT EXISTS (SELECT 1 FROM teams WHERE type = 'ptn'::team_type);

-- 2) 기존 팀 표시명 풀네임 정리
UPDATE teams SET name = 'Technical Training Team' WHERE type = 'tt'::team_type;
UPDATE teams SET name = 'Development Team'         WHERE type = 'dev'::team_type;
-- MSP팀은 매출 분배 56건 보존용 레거시 (사용자 배치 없음)
UPDATE teams SET name = 'MSP (Legacy)'             WHERE type = 'msp'::team_type;

-- 3) 사용자 재배치 (이메일 기준)
UPDATE profiles SET team_id = (SELECT id FROM teams WHERE type = 'ai'::team_type LIMIT 1)
  WHERE email IN ('jayden.kim@nxtcloud.kr', 'brad.kim@nxtcloud.kr');

UPDATE profiles SET team_id = (SELECT id FROM teams WHERE type = 'ptn'::team_type LIMIT 1)
  WHERE email IN ('sik.ham@nxtcloud.kr', 'kevin.choi@nxtcloud.kr', 'lucy.son@nxtcloud.kr');

UPDATE profiles SET team_id = (SELECT id FROM teams WHERE type = 'ops'::team_type LIMIT 1)
  WHERE email = 'amanda.song@nxtcloud.kr';

-- tt(교육팀)·dev(개발팀) 잔류 인원은 기존 team_id 그대로 — UPDATE 불필요

-- 4) 백종훈 profiles 삭제 (auth.users는 Dashboard에서 별도 삭제)
DELETE FROM profiles WHERE email = 'sancho.baek@nxtcloud.kr';

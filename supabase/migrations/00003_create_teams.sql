-- NXT CRM v2: 팀 테이블

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type team_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 초기 팀 데이터
INSERT INTO teams (name, type) VALUES
  ('MSP팀', 'msp'),
  ('교육팀', 'education'),
  ('개발팀', 'dev');

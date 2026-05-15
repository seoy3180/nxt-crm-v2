-- ============================================================
-- NXT CRM v2 — Staging 시드 데이터
-- 사용자 6명이 staging에 추가된 상태에서 실행 (handle_new_user 트리거로 profiles 자동 생성됨)
-- 실행: https://supabase.com/dashboard/project/afydtaxmuwjdhmdwgemy/sql/new
-- ============================================================

DO $$
DECLARE
  team_msp uuid;
  team_edu uuid;
  team_dev uuid;

  user_karin uuid;
  user_sikham uuid;
  user_ella uuid;
  user_admin uuid;

  client_a uuid;  -- MSP
  client_b uuid;  -- MSP
  client_c uuid;  -- MSP (critical 예치금용)
  client_d uuid;  -- Education

  contract_a uuid;
  contract_b uuid;
  contract_c uuid;
  contract_d uuid;

  acct uuid;
BEGIN
  -- ============================================================
  -- 1) Teams (3개)
  -- ============================================================
  INSERT INTO teams (name, type) VALUES ('MSP팀', 'msp')        RETURNING id INTO team_msp;
  INSERT INTO teams (name, type) VALUES ('교육팀', 'education')  RETURNING id INTO team_edu;
  INSERT INTO teams (name, type) VALUES ('개발팀', 'dev')        RETURNING id INTO team_dev;

  -- ============================================================
  -- 2) Profiles 역할/팀 갱신 (handle_new_user가 만든 행 업데이트)
  -- ============================================================
  UPDATE profiles SET role='admin'::user_role,    team_id=NULL      WHERE email='karin.kim@nxtcloud.kr';
  UPDATE profiles SET role='admin'::user_role,    team_id=NULL      WHERE email='admin@nxtcloud.kr';
  UPDATE profiles SET role='c_level'::user_role,  team_id=NULL      WHERE email='jack.choi@nxtcloud.kr';
  UPDATE profiles SET role='c_level'::user_role,  team_id=NULL      WHERE email='teo.park@nxtcloud.kr';
  UPDATE profiles SET role='team_lead'::user_role, team_id=team_msp WHERE email='sik.ham@nxtcloud.kr';
  UPDATE profiles SET role='staff'::user_role,    team_id=team_edu  WHERE email='ella.kim@nxtcloud.kr';

  -- Profile id 캐싱 (FK 용도)
  SELECT id INTO user_karin  FROM profiles WHERE email='karin.kim@nxtcloud.kr';
  SELECT id INTO user_sikham FROM profiles WHERE email='sik.ham@nxtcloud.kr';
  SELECT id INTO user_ella   FROM profiles WHERE email='ella.kim@nxtcloud.kr';
  SELECT id INTO user_admin  FROM profiles WHERE email='admin@nxtcloud.kr';

  -- ============================================================
  -- 3) Clients (4개)
  -- ============================================================
  INSERT INTO clients (client_id, name, client_type, business_types, status, memo) VALUES
    ('UNIV-001', '서울대학교_천둥연구실 (테스트)', 'univ'::client_type, ARRAY['msp'::business_type], '활성'::client_status_type, 'staging 시드')
    RETURNING id INTO client_a;
  INSERT INTO clients (client_id, name, client_type, business_types, status, memo) VALUES
    ('CORP-001', '디스코 (테스트)', 'corp'::client_type, ARRAY['msp'::business_type], '활성'::client_status_type, 'staging 시드')
    RETURNING id INTO client_b;
  INSERT INTO clients (client_id, name, client_type, business_types, status, memo) VALUES
    ('CORP-002', '코난테크 (테스트)', 'corp'::client_type, ARRAY['msp'::business_type], '활성'::client_status_type, 'staging 시드')
    RETURNING id INTO client_c;
  INSERT INTO clients (client_id, name, client_type, business_types, status, memo) VALUES
    ('UNIV-002', '연세대학교 (테스트)', 'univ'::client_type, ARRAY['tt'::business_type], '활성'::client_status_type, 'staging 시드')
    RETURNING id INTO client_d;

  -- client_msp_details
  INSERT INTO client_msp_details (client_id, industry, company_size) VALUES
    (client_a, '서울대 연구실'::industry_type, '공공기관'::company_size_type),
    (client_b, 'IT'::industry_type, '중소기업'::company_size_type),
    (client_c, 'IT'::industry_type, '스타트업'::company_size_type);

  -- ============================================================
  -- 4) Contracts (4개)
  -- ============================================================
  INSERT INTO contracts (contract_id, client_id, type, name, currency, stage, total_amount, assigned_to)
    VALUES ('MSP-001', client_a, 'msp'::contract_type, '서울대학교_천둥연구실 MSP', 'KRW'::currency_type, 'billing_complete', 12000000, user_sikham)
    RETURNING id INTO contract_a;
  INSERT INTO contracts (contract_id, client_id, type, name, currency, stage, total_amount, assigned_to)
    VALUES ('MSP-002', client_b, 'msp'::contract_type, '디스코 MSP', 'KRW'::currency_type, 'billing_complete', 5000000, user_sikham)
    RETURNING id INTO contract_b;
  INSERT INTO contracts (contract_id, client_id, type, name, currency, stage, total_amount, assigned_to)
    VALUES ('MSP-003', client_c, 'msp'::contract_type, '코난테크 MSP', 'KRW'::currency_type, 'billing_complete', 3000000, user_sikham)
    RETURNING id INTO contract_c;
  INSERT INTO contracts (contract_id, client_id, type, name, currency, stage, total_amount, assigned_to)
    VALUES ('CT2026001', client_d, 'tt'::contract_type, '연세대학교 클라우드 교육', 'KRW'::currency_type, 'operating', 8000000, user_ella)
    RETURNING id INTO contract_d;

  -- contract_msp_details
  INSERT INTO contract_msp_details (contract_id, msp_grade, billing_method, credit_share, payer, billing_on) VALUES
    (contract_a, 'MSP10'::msp_grade_type, '매월 10일 세금계산서 발행'::billing_method_type, '가능'::credit_share_type, 'ETV-AWS-14'::payer_type, true),
    (contract_b, 'MSP15'::msp_grade_type, '매월 10일 세금계산서 발행'::billing_method_type, '가능'::credit_share_type, 'ETV-AWS-13'::payer_type, true),
    (contract_c, 'FREE'::msp_grade_type,  '매월 10일 세금계산서 발행'::billing_method_type, '불가능'::credit_share_type, 'ETV-AWS-13'::payer_type, false);

  -- contract_teams (계약-팀 매핑, RLS의 can_access_contract가 이걸 본다)
  INSERT INTO contract_teams (contract_id, team_id, percentage) VALUES
    (contract_a, team_msp, 100),
    (contract_b, team_msp, 100),
    (contract_c, team_msp, 100),
    (contract_d, team_edu, 100);

  -- ============================================================
  -- 5) Employees (영업담당자/기술담당자 매핑용)
  -- ============================================================
  INSERT INTO employees (name, email, team_id, is_active, is_sales_rep, profile_id) VALUES
    ('함동식', 'sik.ham@nxtcloud.kr', team_msp, true, true, user_sikham),
    ('김유림', 'ella.kim@nxtcloud.kr', team_edu, true, false, user_ella);

  -- ============================================================
  -- 6) 예치금 시드 (3 시나리오)
  -- ============================================================
  -- critical: 코난테크 (잔액 음수)
  INSERT INTO deposit_accounts (contract_id) VALUES (contract_c) RETURNING id INTO acct;
  INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, memo, source, created_by) VALUES
    (acct, '2026-02-01', 'deposit'::deposit_txn_type, 3000000, '3개월분 예치', 'manual'::deposit_txn_source, user_karin),
    (acct, '2026-02-28', 'usage'::deposit_txn_type,    890000, 'AWS 2월 사용분', 'manual'::deposit_txn_source, user_karin),
    (acct, '2026-03-31', 'usage'::deposit_txn_type,    950000, 'AWS 3월 사용분', 'manual'::deposit_txn_source, user_karin),
    (acct, '2026-04-30', 'usage'::deposit_txn_type,   1080000, 'AWS 4월 사용분', 'manual'::deposit_txn_source, user_karin),
    (acct, '2026-05-31', 'usage'::deposit_txn_type,    100000, 'AWS 5월 사용분', 'manual'::deposit_txn_source, user_karin);

  -- warning: 디스코 (잔액 ~22%)
  INSERT INTO deposit_accounts (contract_id) VALUES (contract_b) RETURNING id INTO acct;
  INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, memo, source, created_by) VALUES
    (acct, '2026-04-01', 'deposit'::deposit_txn_type, 5000000, '예치',           'manual'::deposit_txn_source, user_karin),
    (acct, '2026-04-30', 'usage'::deposit_txn_type,   2000000, 'AWS 4월 사용분', 'manual'::deposit_txn_source, user_karin),
    (acct, '2026-05-31', 'usage'::deposit_txn_type,   1900000, 'AWS 5월 사용분', 'manual'::deposit_txn_source, user_karin);

  -- ok: 서울대 (잔액 충분)
  INSERT INTO deposit_accounts (contract_id) VALUES (contract_a) RETURNING id INTO acct;
  INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, memo, source, created_by) VALUES
    (acct, '2026-01-05', 'deposit'::deposit_txn_type, 12000000, '연간 선결제',     'manual'::deposit_txn_source, user_karin),
    (acct, '2026-01-31', 'usage'::deposit_txn_type,     980000, 'AWS 1월 사용분', 'manual'::deposit_txn_source, user_karin),
    (acct, '2026-02-28', 'usage'::deposit_txn_type,    1050000, 'AWS 2월 사용분', 'manual'::deposit_txn_source, user_karin),
    (acct, '2026-03-31', 'usage'::deposit_txn_type,     920000, 'AWS 3월 사용분', 'manual'::deposit_txn_source, user_karin),
    (acct, '2026-04-30', 'usage'::deposit_txn_type,    1100000, 'AWS 4월 사용분', 'manual'::deposit_txn_source, user_karin);

  RAISE NOTICE '시드 완료: teams=3, clients=4, contracts=4, deposit_accounts=3';
END $$;

-- ============================================================
-- 검증
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM teams) AS teams,
  (SELECT COUNT(*) FROM clients) AS clients,
  (SELECT COUNT(*) FROM contracts) AS contracts,
  (SELECT COUNT(*) FROM contract_teams) AS contract_teams,
  (SELECT COUNT(*) FROM deposit_accounts) AS deposit_accounts,
  (SELECT COUNT(*) FROM deposit_transactions) AS deposit_txns,
  (SELECT COUNT(*) FROM profiles WHERE role IS NOT NULL) AS profiles_with_role;

SELECT c.name, a.balance, a.total_deposit, ROUND((a.balance::numeric / NULLIF(a.total_deposit,0)) * 100, 1) AS pct
FROM deposit_accounts a JOIN contracts c ON c.id = a.contract_id
ORDER BY a.balance;

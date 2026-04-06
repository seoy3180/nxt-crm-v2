-- NXT CRM v2: 개발용 더미 시드 데이터
-- 주의: auth.users는 Supabase Dashboard에서 수동 생성 후 이 스크립트 실행

-- 강사 마스터 데이터
INSERT INTO instructors (name, email, phone, organization, team, position, status) VALUES
  ('김서윤', 'karin.kim@nxtcloud.kr', NULL, 'NXTCLOUD', 'Technical Training', 'Technical Trainer', '활동'),
  ('이민수', 'minsu.lee@nxtcloud.kr', NULL, 'NXTCLOUD', 'Technical Training', 'Technical Trainer', '활동'),
  ('박지훈', 'jihun.park@nxtcloud.kr', NULL, 'NXTCLOUD', 'Technical Training', 'Team Lead', '활동'),
  ('최영호', 'youngho.choi@aws.com', NULL, 'AWS', 'T&C', 'Instructor', '활동'),
  ('정수민', 'sumin.jung@partner.co', NULL, 'Partner', NULL, 'Instructor', '활동');

-- 고객 더미 데이터
INSERT INTO clients (client_id, name, client_type, grade, business_types, status, memo) VALUES
  ('UNIV-001', '서울대학교', 'univ', 'A', '{tt}', '활성', '주요 교육 고객'),
  ('UNIV-002', '연세대학교', 'univ', 'B', '{tt}', '활성', NULL),
  ('CORP-001', '삼성SDS', 'corp', 'A', '{msp,tt}', '활성', 'MSP + 교육 복합'),
  ('CORP-002', '네이버클라우드', 'corp', 'B', '{msp}', '활성', 'MSP 전용'),
  ('CORP-003', '카카오엔터프라이즈', 'corp', 'B', '{msp}', '진행중', NULL),
  ('GOVT-001', '과학기술정보통신부', 'govt', 'A', '{tt}', '활성', '정부 교육 프로젝트'),
  ('ASSO-001', '한국클라우드산업협회', 'asso', 'C', '{tt}', '활성', NULL),
  ('CORP-004', 'LG CNS', 'corp', 'A', '{msp,tt,dev}', '활성', '대형 종합 고객');

-- 상위-하위 고객 관계
UPDATE clients SET parent_id = (SELECT id FROM clients WHERE client_id = 'CORP-004')
  WHERE client_id = 'CORP-001';

-- 연락처 더미 데이터
INSERT INTO contacts (client_id, name, email, phone, department, position, role, is_primary)
SELECT c.id, '홍길동', 'hong@samsungsds.com', '010-1234-5678', 'IT팀', '팀장', '기술담당', true
FROM clients c WHERE c.client_id = 'CORP-001';

INSERT INTO contacts (client_id, name, email, phone, department, position, role, is_primary)
SELECT c.id, '김영희', 'kim@samsungsds.com', '010-9876-5432', '구매팀', '과장', '결제자', false
FROM clients c WHERE c.client_id = 'CORP-001';

INSERT INTO contacts (client_id, name, email, phone, department, position, role, is_primary)
SELECT c.id, '이철수', 'lee@navercloud.com', '010-5555-6666', '클라우드사업부', '부장', '기술담당', true
FROM clients c WHERE c.client_id = 'CORP-002';

-- MSP 계약 더미 데이터
INSERT INTO contracts (contract_id, client_id, type, name, total_amount, currency, stage, description)
SELECT 'MSP-001', c.id, 'msp', '삼성SDS MSP 서비스', 120000000, 'KRW', 'contracted', 'AWS 매니지드 서비스'
FROM clients c WHERE c.client_id = 'CORP-001';

INSERT INTO contracts (contract_id, client_id, type, name, total_amount, currency, stage, description)
SELECT 'MSP-002', c.id, 'msp', '네이버클라우드 MSP', 80000000, 'KRW', 'pre_contract', 'AWS 전환 프로젝트'
FROM clients c WHERE c.client_id = 'CORP-002';

-- 교육 계약 더미 데이터
INSERT INTO contracts (contract_id, client_id, type, name, total_amount, currency, stage, description)
SELECT 'CT2026001', c.id, 'tt', 'AWS 클라우드 교육 과정', 30000000, 'KRW', 'proposal', '기초 + 심화 과정'
FROM clients c WHERE c.client_id = 'UNIV-001';

INSERT INTO contracts (contract_id, client_id, type, name, total_amount, currency, stage, description)
SELECT 'CT2026002', c.id, 'tt', '정부 클라우드 인력양성', 50000000, 'KRW', 'contracted', '공무원 대상 클라우드 교육'
FROM clients c WHERE c.client_id = 'GOVT-001';

-- MSP 확장 데이터
INSERT INTO contract_msp_details (contract_id, billing_level, credit_share, expected_mrr, payer, sales_rep, aws_amount, has_management_fee)
SELECT c.id, 'MSP15', 15.0, 10000000, '삼성SDS', '박진성', 100000000, true
FROM contracts c WHERE c.contract_id = 'MSP-001';

INSERT INTO contract_msp_details (contract_id, billing_level, credit_share, expected_mrr, payer, sales_rep, aws_amount, has_management_fee)
SELECT c.id, 'MSP10', 10.0, 7000000, '네이버클라우드', '박진성', 70000000, false
FROM contracts c WHERE c.contract_id = 'MSP-002';

-- 교육 확장 데이터
INSERT INTO contract_tt_details (contract_id)
SELECT c.id FROM contracts c WHERE c.contract_id = 'CT2026001';

INSERT INTO contract_tt_details (contract_id)
SELECT c.id FROM contracts c WHERE c.contract_id = 'CT2026002';

-- 팀 매출 배분
INSERT INTO contract_teams (contract_id, team_id, percentage)
SELECT c.id, t.id, 100
FROM contracts c, teams t
WHERE c.contract_id = 'MSP-001' AND t.type = 'msp';

INSERT INTO contract_teams (contract_id, team_id, percentage)
SELECT c.id, t.id, 100
FROM contracts c, teams t
WHERE c.contract_id = 'MSP-002' AND t.type = 'msp';

INSERT INTO contract_teams (contract_id, team_id, percentage)
SELECT c.id, t.id, 100
FROM contracts c, teams t
WHERE c.contract_id = 'CT2026001' AND t.type = 'education';

INSERT INTO contract_teams (contract_id, team_id, percentage)
SELECT c.id, t.id, 100
FROM contracts c, teams t
WHERE c.contract_id = 'CT2026002' AND t.type = 'education';

-- 교육 운영 더미 데이터
INSERT INTO education_operations (contract_id, operation_name, location, target_org, start_date, end_date, total_hours, contracted_count, recruited_count, provides_lunch, provides_snack)
SELECT c.id, 'AWS 기초 과정 1차', '서울대학교 공학관', '서울대학교', '2026-05-01', '2026-05-05', 40, 30, 35, true, true
FROM contracts c WHERE c.contract_id = 'CT2026001';

INSERT INTO education_operations (contract_id, operation_name, location, target_org, start_date, end_date, total_hours, contracted_count, recruited_count, provides_lunch, provides_snack)
SELECT c.id, 'AWS 심화 과정 2차', '서울대학교 공학관', '서울대학교', '2026-06-01', '2026-06-03', 24, 20, 22, true, false
FROM contracts c WHERE c.contract_id = 'CT2026001';

-- 강사 배정
INSERT INTO operation_instructors (operation_id, instructor_id, role, assigned_date)
SELECT eo.id, i.id, '주강사', '2026-05-01'
FROM education_operations eo, instructors i
WHERE eo.operation_name = 'AWS 기초 과정 1차' AND i.name = '김서윤';

INSERT INTO operation_instructors (operation_id, instructor_id, role, assigned_date)
SELECT eo.id, i.id, '보조강사', '2026-05-01'
FROM education_operations eo, instructors i
WHERE eo.operation_name = 'AWS 기초 과정 1차' AND i.name = '이민수';

-- MSP 고객 확장 데이터
INSERT INTO client_msp_details (client_id, msp_grade, industry, company_size, tags, memo, aws_account_ids, aws_am)
SELECT c.id, 'MSP15', 'IT/소프트웨어', '대기업', '{클라우드,엔터프라이즈}', NULL, '{123456789012}', '김병준'
FROM clients c WHERE c.client_id = 'CORP-001';

INSERT INTO client_msp_details (client_id, msp_grade, industry, company_size, tags, memo, aws_account_ids, aws_am)
SELECT c.id, 'MSP10', 'IT/클라우드', '대기업', '{클라우드}', NULL, '{987654321098}', '비고'
FROM clients c WHERE c.client_id = 'CORP-002';

-- 교육 고객 확장 데이터
INSERT INTO client_edu_details (client_id, edu_grade, memo)
SELECT c.id, 'A', '핵심 교육 파트너'
FROM clients c WHERE c.client_id = 'UNIV-001';

INSERT INTO client_edu_details (client_id, edu_grade, memo)
SELECT c.id, 'A', '정부 주요 고객'
FROM clients c WHERE c.client_id = 'GOVT-001';

-- 계약 이력 (초기 단계 설정)
INSERT INTO contract_history (contract_id, from_stage, to_stage, changed_by, note)
SELECT c.id, NULL, 'contracted', (SELECT id FROM profiles LIMIT 1), '계약 체결 완료'
FROM contracts c WHERE c.contract_id = 'MSP-001';

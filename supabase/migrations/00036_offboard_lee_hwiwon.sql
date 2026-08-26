-- 00036: 이휘원(COO, oliver.lee@nxtcloud.kr) 퇴사 처리 — 기록용 (2026-08-26 운영 DB에 수동 실행 완료)
--
-- ⚠️ auth.users 삭제는 SQL 금지 — Supabase Dashboard > Authentication 에서 처리함.
-- ⚠️ 아래 문장은 멱등(대상 0건이면 no-op). 재실행해도 무해.
--
-- 실행 순서 (실제 처리 순서 그대로):
--   1) employees.is_sales_rep = false      → 영업 담당 드롭다운 제외
--   2) employees.is_active = false         → 모든 직원 목록/검색 제외
--   3) employees.profile_id = NULL         → auth.users 삭제 시 profiles CASCADE가 employees FK(staff_profile_id_fkey)에 막히지 않도록 연결 해제
--   4) (Dashboard) auth.users 삭제          → profiles ON DELETE CASCADE로 함께 삭제
--   5) 인하대 MSP(07cd24c5) 영업 담당 이휘원 → 박진성 교체 (UI에서 처리)
--   6) employees 하드 딜리트               → FK 참조(sales_rep / tech_leads / assigned_to) 0건 확인 후
--
-- 백종훈(00031_c)과 다른 점: 이휘원은 contract_msp_details.sales_rep_id 참조 1건이 있어
-- 5)를 먼저 처리해야 6)이 가능했고, employees가 남아 있는 상태에서 auth 삭제가 필요해 3)이 추가됨.

UPDATE employees SET is_sales_rep = false, is_active = false, profile_id = NULL
WHERE email = 'oliver.lee@nxtcloud.kr';

UPDATE contract_msp_details SET sales_rep_id = (SELECT id FROM employees WHERE name = '박진성' LIMIT 1)
WHERE contract_id = '07cd24c5-fdee-492b-8942-fd2466a48ed2'
  AND sales_rep_id = (SELECT id FROM employees WHERE email = 'oliver.lee@nxtcloud.kr');

DELETE FROM employees WHERE email = 'oliver.lee@nxtcloud.kr';

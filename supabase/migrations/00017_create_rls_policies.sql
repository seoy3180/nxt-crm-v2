-- 모든 테이블에 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_msp_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_tt_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE operation_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_msp_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_edu_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- profiles: 전체 조회, 본인만 수정
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- teams: 전체 조회 (읽기 전용)
CREATE POLICY "teams_select" ON teams FOR SELECT USING (true);

-- clients: 역할별 접근
CREATE POLICY "clients_select" ON clients FOR SELECT
  USING (public.can_access_client(id));
CREATE POLICY "clients_insert" ON clients FOR INSERT
  WITH CHECK (true);
CREATE POLICY "clients_update" ON clients FOR UPDATE
  USING (public.can_access_client(id));
CREATE POLICY "clients_delete" ON clients FOR DELETE
  USING (public.can_access_client(id));

-- contacts: 고객 접근 권한과 동일
CREATE POLICY "contacts_select" ON contacts FOR SELECT
  USING (public.can_access_client(client_id));
CREATE POLICY "contacts_insert" ON contacts FOR INSERT
  WITH CHECK (public.can_access_client(client_id));
CREATE POLICY "contacts_update" ON contacts FOR UPDATE
  USING (public.can_access_client(client_id));
CREATE POLICY "contacts_delete" ON contacts FOR DELETE
  USING (public.can_access_client(client_id));

-- contracts: 팀 배분 기반
CREATE POLICY "contracts_select" ON contracts FOR SELECT
  USING (public.can_access_contract(id));
CREATE POLICY "contracts_insert" ON contracts FOR INSERT
  WITH CHECK (true);
CREATE POLICY "contracts_update" ON contracts FOR UPDATE
  USING (public.can_access_contract(id));
CREATE POLICY "contracts_delete" ON contracts FOR DELETE
  USING (public.can_access_contract(id));

-- contract_msp_details: 계약 접근 권한과 동일
CREATE POLICY "msp_details_select" ON contract_msp_details FOR SELECT
  USING (public.can_access_contract(contract_id));
CREATE POLICY "msp_details_insert" ON contract_msp_details FOR INSERT
  WITH CHECK (public.can_access_contract(contract_id));
CREATE POLICY "msp_details_update" ON contract_msp_details FOR UPDATE
  USING (public.can_access_contract(contract_id));

-- contract_tt_details: 계약 접근 권한과 동일
CREATE POLICY "tt_details_select" ON contract_tt_details FOR SELECT
  USING (public.can_access_contract(contract_id));
CREATE POLICY "tt_details_insert" ON contract_tt_details FOR INSERT
  WITH CHECK (public.can_access_contract(contract_id));
CREATE POLICY "tt_details_update" ON contract_tt_details FOR UPDATE
  USING (public.can_access_contract(contract_id));

-- contract_teams: 계약 접근 권한과 동일
CREATE POLICY "contract_teams_select" ON contract_teams FOR SELECT
  USING (public.can_access_contract(contract_id));
CREATE POLICY "contract_teams_insert" ON contract_teams FOR INSERT
  WITH CHECK (public.can_access_contract(contract_id));
CREATE POLICY "contract_teams_update" ON contract_teams FOR UPDATE
  USING (public.can_access_contract(contract_id));

-- contract_history: 계약 접근 권한
CREATE POLICY "history_select" ON contract_history FOR SELECT
  USING (public.can_access_contract(contract_id));
CREATE POLICY "history_insert" ON contract_history FOR INSERT
  WITH CHECK (public.can_access_contract(contract_id));

-- education_operations: 계약 접근 권한
CREATE POLICY "edu_ops_select" ON education_operations FOR SELECT
  USING (public.can_access_contract(contract_id));
CREATE POLICY "edu_ops_insert" ON education_operations FOR INSERT
  WITH CHECK (public.can_access_contract(contract_id));
CREATE POLICY "edu_ops_update" ON education_operations FOR UPDATE
  USING (public.can_access_contract(contract_id));
CREATE POLICY "edu_ops_delete" ON education_operations FOR DELETE
  USING (public.can_access_contract(contract_id));

-- instructors: 전체 조회 가능, admin/c_level만 수정
CREATE POLICY "instructors_select" ON instructors FOR SELECT USING (true);
CREATE POLICY "instructors_insert" ON instructors FOR INSERT
  WITH CHECK (true);
CREATE POLICY "instructors_update" ON instructors FOR UPDATE
  USING (true);

-- operation_instructors: 운영의 계약 접근 권한 기반
CREATE POLICY "op_instructors_select" ON operation_instructors FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM education_operations eo
    WHERE eo.id = operation_id
      AND public.can_access_contract(eo.contract_id)
  ));
CREATE POLICY "op_instructors_insert" ON operation_instructors FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM education_operations eo
    WHERE eo.id = operation_id
      AND public.can_access_contract(eo.contract_id)
  ));
CREATE POLICY "op_instructors_update" ON operation_instructors FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM education_operations eo
    WHERE eo.id = operation_id
      AND public.can_access_contract(eo.contract_id)
  ));
CREATE POLICY "op_instructors_delete" ON operation_instructors FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM education_operations eo
    WHERE eo.id = operation_id
      AND public.can_access_contract(eo.contract_id)
  ));

-- client_msp_details: 고객 접근 권한
CREATE POLICY "client_msp_select" ON client_msp_details FOR SELECT
  USING (public.can_access_client(client_id));
CREATE POLICY "client_msp_insert" ON client_msp_details FOR INSERT
  WITH CHECK (public.can_access_client(client_id));
CREATE POLICY "client_msp_update" ON client_msp_details FOR UPDATE
  USING (public.can_access_client(client_id));

-- client_edu_details: 고객 접근 권한
CREATE POLICY "client_edu_select" ON client_edu_details FOR SELECT
  USING (public.can_access_client(client_id));
CREATE POLICY "client_edu_insert" ON client_edu_details FOR INSERT
  WITH CHECK (public.can_access_client(client_id));
CREATE POLICY "client_edu_update" ON client_edu_details FOR UPDATE
  USING (public.can_access_client(client_id));

-- user_preferences: 본인만
CREATE POLICY "prefs_select" ON user_preferences FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "prefs_insert" ON user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "prefs_update" ON user_preferences FOR UPDATE
  USING (user_id = auth.uid());

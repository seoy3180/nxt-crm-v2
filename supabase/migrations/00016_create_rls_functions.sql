-- 현재 사용자의 역할 가져오기
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 사용자의 팀 ID 가져오기
CREATE OR REPLACE FUNCTION auth.user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 사용자가 admin 또는 c_level인지
CREATE OR REPLACE FUNCTION auth.is_admin_or_clevel()
RETURNS BOOLEAN AS $$
  SELECT auth.user_role() IN ('admin', 'c_level');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 특정 계약이 현재 사용자의 팀에 배분되어 있는지
CREATE OR REPLACE FUNCTION auth.can_access_contract(p_contract_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- admin/c_level은 모든 계약 접근 가능
  IF auth.is_admin_or_clevel() THEN
    RETURN TRUE;
  END IF;

  -- team_lead/staff는 소속 팀 배분 계약만
  RETURN EXISTS (
    SELECT 1 FROM contract_teams
    WHERE contract_id = p_contract_id
      AND team_id = auth.user_team_id()
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 특정 고객이 현재 사용자의 팀 계약과 관련 있는지
CREATE OR REPLACE FUNCTION auth.can_access_client(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.is_admin_or_clevel() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM contracts c
    JOIN contract_teams ct ON ct.contract_id = c.id
    WHERE c.client_id = p_client_id
      AND ct.team_id = auth.user_team_id()
      AND c.deleted_at IS NULL
      AND ct.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

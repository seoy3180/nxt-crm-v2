-- NXT CRM v2: 매출 배분

CREATE TABLE contract_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (contract_id, team_id)
);

CREATE TRIGGER contract_teams_updated_at
  BEFORE UPDATE ON contract_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

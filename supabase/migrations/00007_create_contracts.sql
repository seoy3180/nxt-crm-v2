-- NXT CRM v2: 계약 (통합 모델)

CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES clients(id),
  type contract_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_amount BIGINT DEFAULT 0,
  currency currency_type DEFAULT 'KRW',
  stage TEXT,
  assigned_to UUID REFERENCES profiles(id),
  contact_id UUID REFERENCES contacts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  -- stage CHECK: type에 따라 허용 단계 제한
  CONSTRAINT contracts_stage_check CHECK (
    stage IS NULL
    OR (type = 'msp' AND stage IN ('pre_contract', 'contracted', 'completed', 'settled'))
    OR (type = 'tt' AND stage IN ('proposal', 'contracted', 'operating', 'op_completed', 'settled'))
    OR (type = 'dev')
  )
);

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- MSP 계약 ID 생성: MSP-001
CREATE OR REPLACE FUNCTION generate_msp_contract_id()
RETURNS TEXT AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_id FROM 5) AS INT)
  ), 0) + 1
  INTO seq
  FROM contracts
  WHERE contract_id LIKE 'MSP-%';

  RETURN 'MSP-' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 교육 계약 ID 생성: CT2026001
CREATE OR REPLACE FUNCTION generate_edu_contract_id()
RETURNS TEXT AS $$
DECLARE
  yr TEXT;
  seq INT;
BEGIN
  yr := EXTRACT(YEAR FROM now())::TEXT;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_id FROM 7) AS INT)
  ), 0) + 1
  INTO seq
  FROM contracts
  WHERE contract_id LIKE 'CT' || yr || '%';

  RETURN 'CT' || yr || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

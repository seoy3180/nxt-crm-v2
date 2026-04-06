-- NXT CRM v2: 고객 확장 테이블 (MSP / 교육)

-- MSP 고객 확장
CREATE TABLE client_msp_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  msp_grade TEXT,
  industry TEXT,
  company_size TEXT,
  tags TEXT[] DEFAULT '{}',
  memo TEXT,
  aws_account_ids TEXT[] DEFAULT '{}',
  aws_am TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER client_msp_details_updated_at
  BEFORE UPDATE ON client_msp_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 교육 고객 확장
CREATE TABLE client_edu_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  edu_grade TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER client_edu_details_updated_at
  BEFORE UPDATE ON client_edu_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

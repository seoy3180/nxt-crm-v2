-- NXT CRM v2: 계약 확장 테이블 (MSP / 교육)

-- MSP 계약 확장
CREATE TABLE contract_msp_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
  billing_level TEXT,
  credit_share NUMERIC(5,2),
  expected_mrr BIGINT,
  payer TEXT,
  sales_rep TEXT,
  aws_amount BIGINT,
  has_management_fee BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER contract_msp_details_updated_at
  BEFORE UPDATE ON contract_msp_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 교육 계약 확장
CREATE TABLE contract_tt_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER contract_tt_details_updated_at
  BEFORE UPDATE ON contract_tt_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

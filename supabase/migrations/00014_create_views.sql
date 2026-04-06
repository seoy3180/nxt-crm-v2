-- NXT CRM v2: VIEW

-- 계약 + 확장 정보 통합 뷰
CREATE OR REPLACE VIEW contracts_with_details AS
SELECT
  c.*,
  msp.billing_level,
  msp.credit_share,
  msp.expected_mrr,
  msp.payer,
  msp.sales_rep,
  msp.aws_amount,
  msp.has_management_fee,
  cl.name AS client_name,
  cl.client_id AS client_display_id,
  p.name AS assigned_to_name
FROM contracts c
LEFT JOIN contract_msp_details msp ON msp.contract_id = c.id
LEFT JOIN clients cl ON cl.id = c.client_id
LEFT JOIN profiles p ON p.id = c.assigned_to
WHERE c.deleted_at IS NULL;

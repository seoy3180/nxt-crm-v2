-- 고객 목록 뷰: 고객사 대표 담당자(is_primary) 포함
CREATE OR REPLACE VIEW client_list_view AS
SELECT
  c.*,
  p.name AS assigned_to_name,
  pc.name AS primary_contact_name,
  (SELECT count(*) FROM contracts ct WHERE ct.client_id = c.id AND ct.deleted_at IS NULL) AS contract_count
FROM clients c
LEFT JOIN profiles p ON p.id = c.assigned_to
LEFT JOIN contacts pc ON pc.client_id = c.id AND pc.is_primary = true AND pc.deleted_at IS NULL
WHERE c.deleted_at IS NULL;

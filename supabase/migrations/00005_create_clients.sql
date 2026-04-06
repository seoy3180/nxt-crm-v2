-- NXT CRM v2: 고객 테이블

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  client_type client_type NOT NULL,
  grade client_grade,
  business_types business_type[] DEFAULT '{}',
  parent_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id),
  status TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- updated_at 트리거
CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 계층 2단계 제한 체크
CREATE OR REPLACE FUNCTION check_client_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM clients WHERE id = NEW.parent_id AND parent_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION '고객 계층은 2단계까지만 가능합니다';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_hierarchy_check
  BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION check_client_hierarchy();

-- 고객 ID 자동 생성 함수
CREATE OR REPLACE FUNCTION generate_client_id(p_type client_type)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  seq INT;
BEGIN
  CASE p_type
    WHEN 'univ' THEN prefix := 'UNIV';
    WHEN 'corp' THEN prefix := 'CORP';
    WHEN 'govt' THEN prefix := 'GOVT';
    WHEN 'asso' THEN prefix := 'ASSO';
    WHEN 'etc' THEN prefix := 'ETC';
  END CASE;

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(client_id FROM LENGTH(prefix) + 2) AS INT)
  ), 0) + 1
  INTO seq
  FROM clients
  WHERE client_id LIKE prefix || '-%';

  RETURN prefix || '-' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- NXT CRM v2: 교육 운영 + 강사

-- 강사 마스터 (내부 + 외부)
CREATE TABLE instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  organization TEXT,
  team TEXT,
  position TEXT,
  status TEXT DEFAULT '활동',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER instructors_updated_at
  BEFORE UPDATE ON instructors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 교육 운영 (계약 1:N)
CREATE TABLE education_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  operation_name TEXT NOT NULL,
  location TEXT,
  target_org TEXT,
  start_date DATE,
  end_date DATE,
  total_hours NUMERIC(6,1),
  contracted_count INT,
  recruited_count INT,
  actual_count INT,
  provides_lunch BOOLEAN DEFAULT FALSE,
  provides_snack BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER education_operations_updated_at
  BEFORE UPDATE ON education_operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 운영-강사 배정 (N:N)
CREATE TABLE operation_instructors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES education_operations(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES instructors(id),
  role TEXT NOT NULL,
  assigned_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

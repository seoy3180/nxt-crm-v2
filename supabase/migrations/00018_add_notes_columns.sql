-- operation_instructors에 notes 컬럼 추가
ALTER TABLE operation_instructors ADD COLUMN IF NOT EXISTS notes text;

-- education_operations에 notes 컬럼 추가
ALTER TABLE education_operations ADD COLUMN IF NOT EXISTS notes text;

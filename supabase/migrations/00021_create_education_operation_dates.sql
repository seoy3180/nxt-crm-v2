-- 교육 운영 일자별 테이블
CREATE TABLE education_operation_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id uuid NOT NULL REFERENCES education_operations(id) ON DELETE CASCADE,
  education_date date NOT NULL,
  hours numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_edu_op_dates_operation_id ON education_operation_dates(operation_id);
CREATE UNIQUE INDEX idx_edu_op_dates_unique ON education_operation_dates(operation_id, education_date);

-- date_list 컬럼은 더 이상 불필요하지만, 기존 데이터 호환을 위해 유지
-- 향후 삭제 가능

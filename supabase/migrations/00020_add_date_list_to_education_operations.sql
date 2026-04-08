-- education_operations에 date_list 컬럼 추가 (교육 실시 날짜 배열)
ALTER TABLE education_operations ADD COLUMN IF NOT EXISTS date_list date[] DEFAULT '{}';

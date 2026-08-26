-- 00035: payer_type enum에 ETV-AWS-11, 44, 54 추가
--
-- 순서: ETV-AWS-11, 13, 14, 44, 54, Org-001, Billing Transfer
-- 기존 값(13, 14, Org-001, Billing Transfer)은 유지. 삭제는 별도 요청 시 진행.
ALTER TYPE public.payer_type ADD VALUE IF NOT EXISTS 'ETV-AWS-11' BEFORE 'ETV-AWS-13';
ALTER TYPE public.payer_type ADD VALUE IF NOT EXISTS 'ETV-AWS-44' AFTER 'ETV-AWS-14';
ALTER TYPE public.payer_type ADD VALUE IF NOT EXISTS 'ETV-AWS-54' AFTER 'ETV-AWS-44';

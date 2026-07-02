-- 00037: 예치금 계좌 계약 기간 컬럼 추가

ALTER TABLE public.deposit_accounts
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'deposit_accounts_period_check'
      AND conrelid = 'public.deposit_accounts'::regclass
  ) THEN
    ALTER TABLE public.deposit_accounts
      ADD CONSTRAINT deposit_accounts_period_check
      CHECK (
        start_date IS NULL
        OR end_date IS NULL
        OR end_date >= start_date
      )
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.deposit_accounts
  VALIDATE CONSTRAINT deposit_accounts_period_check;

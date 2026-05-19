-- NXT CRM v2: 예치금(Deposit) 테이블 + RLS
-- 관련 PRD: docs/prd/deposit-dashboard.md
-- 관련 Plan: docs/superpowers/plans/2026-05-15-deposit-dashboard.md Task 1

-- ─── enum 타입 ──────────────────────────────────────

CREATE TYPE deposit_txn_type AS ENUM ('deposit', 'usage', 'adjustment', 'refund');
CREATE TYPE deposit_txn_source AS ENUM ('manual', 'aws_api', 'billing_on');

-- ─── 1) deposit_accounts (1계약:1계좌, UNIQUE) ───────

CREATE TABLE deposit_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     uuid NOT NULL UNIQUE REFERENCES contracts(id),

  -- 캐시 (트리거로 자동 갱신: 00023 마이그레이션)
  balance         bigint NOT NULL DEFAULT 0,
  total_deposit   bigint NOT NULL DEFAULT 0,
  total_usage     bigint NOT NULL DEFAULT 0,
  last_recalc_at  timestamptz,

  -- 메타
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_deposit_accounts_contract
  ON deposit_accounts(contract_id)
  WHERE deleted_at IS NULL;

-- updated_at 자동 갱신 (기존 update_updated_at 트리거 함수 재사용)
CREATE TRIGGER deposit_accounts_updated_at
  BEFORE UPDATE ON deposit_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 2) deposit_transactions (입출 로그, immutable) ───

CREATE TABLE deposit_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES deposit_accounts(id),
  txn_date    date NOT NULL,
  txn_type    deposit_txn_type NOT NULL,
  amount      bigint NOT NULL,
  memo        text,
  source      deposit_txn_source NOT NULL DEFAULT 'manual',
  created_by  uuid REFERENCES profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- 무효화 (immutable 로그 + voided 표시)
  voided_at   timestamptz,
  voided_by   uuid REFERENCES profiles(id),
  void_reason text,

  -- 부호 규칙: adjustment만 음수 허용 (PRD 옵션 E)
  CONSTRAINT amount_sign_check CHECK (
    (txn_type IN ('deposit','usage','refund') AND amount > 0)
    OR (txn_type = 'adjustment' AND amount <> 0)
  )
);

CREATE INDEX idx_deposit_txn_account_date
  ON deposit_transactions(account_id, txn_date DESC)
  WHERE voided_at IS NULL;

CREATE INDEX idx_deposit_txn_active
  ON deposit_transactions(account_id)
  WHERE voided_at IS NULL;

-- ─── 3) RLS ─────────────────────────────────────────

ALTER TABLE deposit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_transactions ENABLE ROW LEVEL SECURITY;

-- 조회: MSP 도메인 한정 + 기존 can_access_contract helper 재사용
CREATE POLICY "deposit_accounts_select" ON deposit_accounts
  FOR SELECT USING (
    public.can_access_contract(contract_id)
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = deposit_accounts.contract_id
        AND c.type = 'msp'::contract_type
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY "deposit_accounts_insert" ON deposit_accounts
  FOR INSERT WITH CHECK (
    public.can_access_contract(contract_id)
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id AND c.type = 'msp'::contract_type
    )
  );

CREATE POLICY "deposit_accounts_update" ON deposit_accounts
  FOR UPDATE USING (public.can_access_contract(contract_id));

-- 트랜잭션 조회: account 접근 가능하면 자동 조회 가능
CREATE POLICY "deposit_txn_select" ON deposit_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deposit_accounts a
      WHERE a.id = deposit_transactions.account_id
        AND public.can_access_contract(a.contract_id)
    )
  );

-- 트랜잭션 등록: adjustment/refund는 admin/c_level만
CREATE POLICY "deposit_txn_insert" ON deposit_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deposit_accounts a
      WHERE a.id = account_id
        AND public.can_access_contract(a.contract_id)
    )
    AND (
      txn_type IN ('deposit'::deposit_txn_type, 'usage'::deposit_txn_type)
      OR public.is_admin_or_clevel()
    )
  );

-- void 업데이트: 본인 입력분(created_by = auth.uid()) 또는 admin/c_level
CREATE POLICY "deposit_txn_update" ON deposit_transactions
  FOR UPDATE USING (
    created_by = auth.uid() OR public.is_admin_or_clevel()
  );

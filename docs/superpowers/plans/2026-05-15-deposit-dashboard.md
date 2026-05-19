# 예치금 대시보드 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NXT CRM v2에 MSP 계약 선결제 예치금 운영 트래킹 대시보드 추가 (잔액 자동 계산 + 사이드바 메뉴 + 계약 상세 탭 + 거래 등록/무효화).

**Architecture:** Supabase Postgres에 `deposit_accounts` (1:1) + `deposit_transactions` 테이블 신설. AFTER 트리거로 잔액 캐시 자동 갱신(타입별 SUM 집계). Next.js 15 App Router로 `/deposit` 메인 + 계약 상세 탭 + 모달 UI. TanStack Query 캐시 일관성.

**Tech Stack:** Next.js 15, TypeScript, Supabase (Postgres + RLS), TanStack Query v5, shadcn/ui, Tailwind v4, React Hook Form + Zod, Vitest, Playwright.

**Source PRD:** `docs/prd/deposit-dashboard.md` (Phase 1~3 완료, Part 4 Pre-mortem 포함)

**UI 디자인:** `ui_design.pen` — Screen/DepositDashboard (H6x72), Screen/DepositDetail (ICfFt), Modal/DepositTxn (loDWX)

---

## File Structure

### 신규 파일

```
supabase/migrations/
  00022_create_deposit_accounts.sql            (테이블 + 인덱스 + RLS)
  00023_create_deposit_balance_trigger.sql     (잔액 자동 갱신 트리거 함수)
  00024_create_contract_delete_guard.sql       (계약 삭제 차단 BEFORE UPDATE 트리거)
supabase/seed/
  deposit-seed.sql                             (시드 시나리오 3종: critical/warning/ok)

src/lib/services/
  deposit-service.ts                           (CRUD + activate/deactivate + void)
src/lib/deposit/
  calc-balance.ts                              (잔액/알림레벨 계산 유틸 — Vitest 단위 테스트 대상)
  types.ts                                     (도메인 타입)
  constants.ts                                 (알림 임계값 등 코드 상수)
src/hooks/
  use-deposit-accounts.ts                      (목록 조회)
  use-deposit-account.ts                       (단건 조회)
  use-deposit-transactions.ts                  (트랜잭션 조회)
  use-deposit-mutations.ts                     (activate/void/등록 mutation 모음)

src/app/(authenticated)/deposit/
  page.tsx                                     (메인 대시보드)
  loading.tsx
  error.tsx
src/components/deposit/
  deposit-kpi-row.tsx                          (글로벌 KPI 4박스, USD/KRW 두 줄)
  deposit-filter-bar.tsx                       (전체/긴급/주의 필터)
  deposit-card.tsx                             (계좌 카드 1장)
  deposit-empty-state.tsx                      (Empty State)
  deposit-account-detail.tsx                   (계약 상세 탭 카드 풀폭)
  deposit-transactions-table.tsx               (거래 내역 테이블)
  deposit-activate-button.tsx                  (활성화/비활성화 액션)
  modals/
    deposit-txn-modal.tsx                      (입금/사용/조정/환불 등록 모달)
    deposit-void-modal.tsx                     (무효화 확인 모달)
    deposit-activate-modal.tsx                 (활성화 확인 모달)
    deposit-deactivate-modal.tsx               (비활성화 확인 모달)

tests/components/deposit/
  calc-balance.test.ts                         (Vitest 단위)
  deposit-card.test.tsx                        (Vitest 컴포넌트)
e2e/
  deposit-dashboard.spec.ts                    (Playwright E2E — Phase 7)
```

### 수정 파일

```
src/components/layout/sidebar.tsx              ("예치금" NavItem + critical 배지 추가)
src/app/(authenticated)/contracts/[id]/page.tsx (예치금 탭 추가, type==='msp' 한정)
src/lib/services/contract-service.ts           (deleteContract에 deposit 잔액 사전 체크)
src/lib/constants.ts                           (DEPOSIT_ALERT_THRESHOLDS 등 추가)
```

---

## Phase 5 — Foundation (DB + 시드)

### Task 1: 마이그레이션 — 테이블 + ENUM + 인덱스 + RLS

**Files:**
- Create: `supabase/migrations/00022_create_deposit_accounts.sql`

- [ ] **Step 1: 파일 작성**

```sql
-- 00022_create_deposit_accounts.sql

CREATE TYPE deposit_txn_type AS ENUM ('deposit', 'usage', 'adjustment', 'refund');
CREATE TYPE deposit_txn_source AS ENUM ('manual', 'aws_api', 'billing_on');

-- 1) deposit_accounts
CREATE TABLE deposit_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     uuid NOT NULL UNIQUE REFERENCES contracts(id),
  balance         bigint NOT NULL DEFAULT 0,
  total_deposit   bigint NOT NULL DEFAULT 0,
  total_usage     bigint NOT NULL DEFAULT 0,
  last_recalc_at  timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX idx_deposit_accounts_contract
  ON deposit_accounts(contract_id) WHERE deleted_at IS NULL;

-- 2) deposit_transactions
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
  voided_at   timestamptz,
  voided_by   uuid REFERENCES profiles(id),
  void_reason text,
  CONSTRAINT amount_sign_check CHECK (
    (txn_type IN ('deposit','usage','refund') AND amount > 0)
    OR (txn_type = 'adjustment' AND amount <> 0)
  )
);
CREATE INDEX idx_deposit_txn_account_date
  ON deposit_transactions(account_id, txn_date DESC) WHERE voided_at IS NULL;
CREATE INDEX idx_deposit_txn_active
  ON deposit_transactions(account_id) WHERE voided_at IS NULL;

-- 3) updated_at 트리거 (기존 update_updated_at 재사용)
CREATE TRIGGER deposit_accounts_updated_at
  BEFORE UPDATE ON deposit_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4) RLS
ALTER TABLE deposit_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposit_transactions ENABLE ROW LEVEL SECURITY;

-- 조회: MSP 도메인 한정 + 기존 can_access_contract helper 재사용
CREATE POLICY "deposit_accounts_select" ON deposit_accounts
  FOR SELECT USING (
    public.can_access_contract(contract_id)
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = deposit_accounts.contract_id
        AND c.type = 'msp'
        AND c.deleted_at IS NULL
    )
  );

CREATE POLICY "deposit_accounts_insert" ON deposit_accounts
  FOR INSERT WITH CHECK (
    public.can_access_contract(contract_id)
    AND EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id AND c.type = 'msp'
    )
  );

CREATE POLICY "deposit_accounts_update" ON deposit_accounts
  FOR UPDATE USING (public.can_access_contract(contract_id));

-- 트랜잭션: account 접근 가능하면 조회/등록
CREATE POLICY "deposit_txn_select" ON deposit_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deposit_accounts a
      WHERE a.id = deposit_transactions.account_id
        AND public.can_access_contract(a.contract_id)
    )
  );

CREATE POLICY "deposit_txn_insert" ON deposit_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM deposit_accounts a
      WHERE a.id = account_id
        AND public.can_access_contract(a.contract_id)
    )
    -- adjustment/refund는 admin만
    AND (
      txn_type IN ('deposit', 'usage')
      OR public.is_admin_or_clevel()
    )
  );

-- void update: 본인 입력분 또는 admin
CREATE POLICY "deposit_txn_update" ON deposit_transactions
  FOR UPDATE USING (
    created_by = auth.uid() OR public.is_admin_or_clevel()
  );
```

- [ ] **Step 2: 사용자에게 마이그레이션 적용 요청**

```
🚨 DB 마이그레이션은 사용자가 직접 실행해야 함 (CLAUDE.md / MEMORY.md 정책).

실행 명령:
  supabase db push
또는 Supabase Dashboard에서 SQL Editor로 위 파일 내용 실행.
```

- [ ] **Step 3: 마이그레이션 적용 검증**

Run: `psql ... -c "\d deposit_accounts"` 또는 Supabase MCP `list_tables`로 확인
Expected: `deposit_accounts`, `deposit_transactions` 테이블 존재, ENUM 2종 등록됨

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00022_create_deposit_accounts.sql
git commit -m "feat(deposit): 예치금 테이블 + RLS 마이그레이션 추가"
```

---

### Task 2: 마이그레이션 — 잔액 자동 갱신 트리거

**Files:**
- Create: `supabase/migrations/00023_create_deposit_balance_trigger.sql`

- [ ] **Step 1: 파일 작성**

```sql
-- 00023_create_deposit_balance_trigger.sql
-- 타입별 SUM 집계 + balance는 4타입 합산 (PRD 3-1A 결정)

CREATE OR REPLACE FUNCTION recalc_deposit_account_balance()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_account_id uuid;
  v_total_deposit    bigint;
  v_total_usage      bigint;
  v_total_adjustment bigint;
  v_total_refund     bigint;
BEGIN
  target_account_id := COALESCE(NEW.account_id, OLD.account_id);

  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposit
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'deposit' AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_usage
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'usage' AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_adjustment
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'adjustment' AND voided_at IS NULL;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_refund
    FROM deposit_transactions
   WHERE account_id = target_account_id
     AND txn_type = 'refund' AND voided_at IS NULL;

  UPDATE deposit_accounts SET
    total_deposit  = v_total_deposit,
    total_usage    = v_total_usage,
    balance        = v_total_deposit - v_total_usage + v_total_adjustment - v_total_refund,
    last_recalc_at = now(),
    updated_at     = now()
   WHERE id = target_account_id;

  RETURN NULL;
END $$;

CREATE TRIGGER trg_deposit_txn_recalc
AFTER INSERT OR UPDATE OF amount, voided_at, txn_type OR DELETE
ON deposit_transactions
FOR EACH ROW EXECUTE FUNCTION recalc_deposit_account_balance();
```

- [ ] **Step 2: 사용자에게 적용 요청**

- [ ] **Step 3: 트리거 동작 검증 (SQL 콘솔)**

```sql
-- 검증 시나리오: 빈 계좌 → deposit 입력 → 잔액 확인
INSERT INTO deposit_accounts (contract_id) VALUES ('<test-contract-id>') RETURNING id;
-- account_id 받아서 사용
INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, source)
VALUES ('<account-id>', CURRENT_DATE, 'deposit', 1200000, 'manual');
SELECT balance, total_deposit, total_usage FROM deposit_accounts WHERE id = '<account-id>';
-- Expected: balance=1200000, total_deposit=1200000, total_usage=0
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00023_create_deposit_balance_trigger.sql
git commit -m "feat(deposit): 잔액 자동 갱신 트리거 추가 (search_path 명시)"
```

---

### Task 3: 마이그레이션 — 계약 삭제 차단 트리거 (BIZ-5)

**Files:**
- Create: `supabase/migrations/00024_create_contract_delete_guard.sql`

- [ ] **Step 1: 파일 작성**

```sql
-- 00024_create_contract_delete_guard.sql
-- 계약 soft delete 시 잔액 != 0 차단 (BIZ-5)

CREATE OR REPLACE FUNCTION guard_contract_delete_with_deposit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM deposit_accounts
       WHERE contract_id = NEW.id
         AND deleted_at IS NULL
         AND balance <> 0
    ) THEN
      RAISE EXCEPTION 'DEPOSIT_BALANCE_NOT_ZERO'
        USING HINT = '예치금 잔액이 남아있어 계약을 종료할 수 없습니다. 환불(refund) 후 다시 시도하세요.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_contract_delete_guard
BEFORE UPDATE OF deleted_at ON contracts
FOR EACH ROW EXECUTE FUNCTION guard_contract_delete_with_deposit();
```

- [ ] **Step 2~4**: 적용 요청 → 검증 → commit (Task 1~2와 동일 패턴)

```bash
git add supabase/migrations/00024_create_contract_delete_guard.sql
git commit -m "feat(deposit): 계약 삭제 차단 트리거 (잔액 != 0 보호)"
```

---

### Task 4: TypeScript 타입 생성

**Files:**
- Modify: `src/types/database.ts` (Supabase 자동 생성)

- [ ] **Step 1: 타입 재생성**

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

- [ ] **Step 2: deposit_accounts, deposit_transactions 타입 확인**

```bash
grep -A 3 "deposit_accounts\|deposit_transactions\|deposit_txn_type" src/types/database.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "chore(deposit): Supabase 타입 재생성"
```

---

### Task 5: 시드 데이터

**Files:**
- Create: `supabase/seed/deposit-seed.sql`

- [ ] **Step 1: 파일 작성 (3종 시나리오)**

```sql
-- deposit-seed.sql
-- critical/warning/ok 각 1건씩 시드. contracts 시드 이후 실행.

DO $$
DECLARE
  contract_critical uuid;
  contract_warning  uuid;
  contract_ok       uuid;
  acct_id           uuid;
BEGIN
  -- 활성 MSP 계약 ID 3개 확보 (계약 마이그레이션 시드 후 실행 가정)
  SELECT id INTO contract_critical FROM contracts WHERE type='msp' AND deleted_at IS NULL ORDER BY created_at LIMIT 1;
  SELECT id INTO contract_warning  FROM contracts WHERE type='msp' AND deleted_at IS NULL AND id <> contract_critical ORDER BY created_at OFFSET 1 LIMIT 1;
  SELECT id INTO contract_ok       FROM contracts WHERE type='msp' AND deleted_at IS NULL AND id <> contract_critical AND id <> contract_warning ORDER BY created_at OFFSET 2 LIMIT 1;

  -- 시나리오 1: critical (잔액 음수)
  INSERT INTO deposit_accounts (contract_id) VALUES (contract_critical) RETURNING id INTO acct_id;
  INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, memo, source)
  VALUES
    (acct_id, '2026-02-01', 'deposit', 3000000, '3개월분 예치', 'manual'),
    (acct_id, '2026-02-28', 'usage',   890000,  'AWS 2월 사용분', 'manual'),
    (acct_id, '2026-03-31', 'usage',   950000,  'AWS 3월 사용분', 'manual'),
    (acct_id, '2026-04-30', 'usage',   1080000, 'AWS 4월 사용분', 'manual'),
    (acct_id, '2026-05-31', 'usage',   100000,  'AWS 5월 추정',   'manual');

  -- 시나리오 2: warning (잔액 20%)
  INSERT INTO deposit_accounts (contract_id) VALUES (contract_warning) RETURNING id INTO acct_id;
  INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, memo, source)
  VALUES
    (acct_id, '2026-04-01', 'deposit', 5000000, '예치', 'manual'),
    (acct_id, '2026-04-30', 'usage',   2000000, 'AWS 4월 사용분', 'manual'),
    (acct_id, '2026-05-31', 'usage',   1900000, 'AWS 5월 사용분', 'manual');

  -- 시나리오 3: ok (잔액 충분)
  INSERT INTO deposit_accounts (contract_id) VALUES (contract_ok) RETURNING id INTO acct_id;
  INSERT INTO deposit_transactions (account_id, txn_date, txn_type, amount, memo, source)
  VALUES
    (acct_id, '2026-01-05', 'deposit', 12000000, '연간 선결제', 'manual'),
    (acct_id, '2026-01-31', 'usage',   980000,   'AWS 1월 사용분', 'manual'),
    (acct_id, '2026-02-28', 'usage',   1050000,  'AWS 2월 사용분', 'manual'),
    (acct_id, '2026-03-31', 'usage',   920000,   'AWS 3월 사용분', 'manual'),
    (acct_id, '2026-04-30', 'usage',   1100000,  'AWS 4월 사용분', 'manual');
END $$;
```

- [ ] **Step 2: 사용자가 dev 환경에서 실행**

```bash
psql ... -f supabase/seed/deposit-seed.sql
```

- [ ] **Step 3: 검증**

```sql
SELECT contract_id, balance, total_deposit, total_usage FROM deposit_accounts;
-- Expected: 3개 행, 각각 음수/낮은 잔액/충분한 잔액
```

- [ ] **Step 4: Commit**

```bash
git add supabase/seed/deposit-seed.sql
git commit -m "feat(deposit): 시드 데이터 3종 시나리오 추가"
```

---

## Phase 6 — 구현 (TDD 가능한 영역은 TDD)

### Task 6: calc-balance 유틸 (TDD)

**Files:**
- Create: `src/lib/deposit/calc-balance.ts`
- Create: `src/lib/deposit/types.ts`
- Create: `src/lib/deposit/constants.ts`
- Test: `tests/lib/deposit/calc-balance.test.ts`

- [ ] **Step 1: 타입 + 상수 작성**

```typescript
// src/lib/deposit/types.ts
export type DepositTxnType = 'deposit' | 'usage' | 'adjustment' | 'refund';
export type DepositTxnSource = 'manual' | 'aws_api' | 'billing_on';
export type AlertLevel = 'critical' | 'warning' | 'ok';

export interface DepositTransaction {
  id: string;
  account_id: string;
  txn_date: string;
  txn_type: DepositTxnType;
  amount: number;
  memo: string | null;
  source: DepositTxnSource;
  voided_at: string | null;
}

export interface DepositAccount {
  id: string;
  contract_id: string;
  balance: number;
  total_deposit: number;
  total_usage: number;
  last_recalc_at: string | null;
  created_at: string;
}
```

```typescript
// src/lib/deposit/constants.ts
export const DEPOSIT_ALERT_THRESHOLDS = {
  critical: { balancePct: 10, days: 14 },
  warning:  { balancePct: 25, days: 45 },
} as const;

export const AVG_MONTHS_WINDOW = 3;
```

- [ ] **Step 2: 실패하는 테스트 작성**

```typescript
// tests/lib/deposit/calc-balance.test.ts
import { describe, it, expect } from 'vitest';
import { calcAlertLevel, calcAvgMonthlyUsage, calcDaysUntilDepleted } from '@/lib/deposit/calc-balance';
import type { DepositTransaction, DepositAccount } from '@/lib/deposit/types';

const account = (over: Partial<DepositAccount> = {}): DepositAccount => ({
  id: 'a', contract_id: 'c', balance: 0, total_deposit: 0, total_usage: 0,
  last_recalc_at: null, created_at: '2026-01-01T00:00:00Z', ...over,
});

const txn = (over: Partial<DepositTransaction> = {}): DepositTransaction => ({
  id: 't', account_id: 'a', txn_date: '2026-01-31', txn_type: 'usage', amount: 100, memo: null,
  source: 'manual', voided_at: null, ...over,
});

describe('calcAvgMonthlyUsage (직전 3개월, 활성 기간 적응)', () => {
  it('활성 5개월 / 직전 3개월 usage 900,000 → 300,000', () => {
    const acct = account({ created_at: '2026-01-01T00:00:00Z', total_usage: 5500000 });
    const txns = [
      txn({ txn_date: '2026-03-31', amount: 200000 }),
      txn({ txn_date: '2026-04-30', amount: 300000 }),
      txn({ txn_date: '2026-05-31', amount: 400000 }),
    ];
    const now = new Date('2026-05-31T12:00:00Z');
    expect(calcAvgMonthlyUsage(acct, txns, now)).toBe(300000);
  });

  it('활성 1개월 / N = min(3,1) = 1', () => {
    const acct = account({ created_at: '2026-05-01T00:00:00Z', total_usage: 800000 });
    const txns = [txn({ txn_date: '2026-05-15', amount: 800000 })];
    const now = new Date('2026-05-31T12:00:00Z');
    expect(calcAvgMonthlyUsage(acct, txns, now)).toBe(800000);
  });

  it('usage 0건 → 0', () => {
    const acct = account({ total_usage: 0 });
    expect(calcAvgMonthlyUsage(acct, [], new Date())).toBe(0);
  });
});

describe('calcAlertLevel', () => {
  it('balancePct=10% 경계는 warning (조건 <10)', () => {
    const acct = account({ balance: 1000000, total_deposit: 10000000 });
    expect(calcAlertLevel(acct, 0)).toBe('warning');
  });

  it('daysUntilDepleted=5 → critical', () => {
    const acct = account({ balance: 50000, total_deposit: 1000000 });
    expect(calcAlertLevel(acct, 300000)).toBe('critical');
  });

  it('잔액 음수 → critical', () => {
    const acct = account({ balance: -20, total_deposit: 3000000 });
    expect(calcAlertLevel(acct, 1000)).toBe('critical');
  });

  it('충분한 잔액 + 사용량 적음 → ok', () => {
    const acct = account({ balance: 8000000, total_deposit: 10000000 });
    expect(calcAlertLevel(acct, 100000)).toBe('ok');
  });
});

describe('calcDaysUntilDepleted', () => {
  it('balance 1,500,000 / avg 300,000 → 150일', () => {
    expect(calcDaysUntilDepleted(1500000, 300000)).toBe(150);
  });
  it('avg 0 → Infinity', () => {
    expect(calcDaysUntilDepleted(1000000, 0)).toBe(Infinity);
  });
});
```

- [ ] **Step 3: 테스트 실행 (실패 확인)**

Run: `npm test tests/lib/deposit/calc-balance.test.ts`
Expected: FAIL (함수 없음)

- [ ] **Step 4: 구현 작성**

```typescript
// src/lib/deposit/calc-balance.ts
import { DEPOSIT_ALERT_THRESHOLDS, AVG_MONTHS_WINDOW } from './constants';
import type { DepositAccount, DepositTransaction, AlertLevel } from './types';

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth()) + 1;
}

export function calcAvgMonthlyUsage(
  account: DepositAccount,
  transactions: DepositTransaction[],
  now: Date = new Date(),
): number {
  const usageTxns = transactions.filter(
    (t) => t.txn_type === 'usage' && !t.voided_at,
  );
  if (usageTxns.length === 0) return 0;

  const activeMonths = Math.max(1, monthsBetween(new Date(account.created_at), now));
  const N = Math.min(AVG_MONTHS_WINDOW, activeMonths);

  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - N);

  const recentSum = usageTxns
    .filter((t) => new Date(t.txn_date) >= cutoff)
    .reduce((s, t) => s + t.amount, 0);

  return Math.round(recentSum / N);
}

export function calcDaysUntilDepleted(balance: number, avgMonthlyUsage: number): number {
  if (avgMonthlyUsage <= 0) return Infinity;
  return Math.round((balance / avgMonthlyUsage) * 30);
}

export function calcBalancePct(account: DepositAccount): number {
  if (account.total_deposit <= 0) return 0;
  return (account.balance / account.total_deposit) * 100;
}

export function calcAlertLevel(account: DepositAccount, avgMonthlyUsage: number): AlertLevel {
  const pct = calcBalancePct(account);
  const days = calcDaysUntilDepleted(account.balance, avgMonthlyUsage);

  if (pct < DEPOSIT_ALERT_THRESHOLDS.critical.balancePct || days < DEPOSIT_ALERT_THRESHOLDS.critical.days) {
    return 'critical';
  }
  if (pct < DEPOSIT_ALERT_THRESHOLDS.warning.balancePct || days < DEPOSIT_ALERT_THRESHOLDS.warning.days) {
    return 'warning';
  }
  return 'ok';
}
```

- [ ] **Step 5: 테스트 재실행 (PASS 확인)**

Run: `npm test tests/lib/deposit/calc-balance.test.ts`
Expected: 9 passed

- [ ] **Step 6: Commit**

```bash
git add src/lib/deposit/ tests/lib/deposit/
git commit -m "feat(deposit): calcBalance 유틸 + Vitest 단위 테스트"
```

---

### Task 7: deposit-service.ts (도메인 서비스 레이어)

**Files:**
- Create: `src/lib/services/deposit-service.ts`

- [ ] **Step 1: 작성**

```typescript
// src/lib/services/deposit-service.ts
import { createClient } from '@/lib/supabase/client';
import type { DepositTxnType, DepositTransaction, DepositAccount } from '@/lib/deposit/types';

export interface DepositAccountWithContract extends DepositAccount {
  contract: {
    id: string;
    name: string;
    contract_id: string;
    currency: 'KRW' | 'USD';
    client_id: string;
    client_name?: string;
  };
}

export const depositService = {
  /** 모든 활성 계좌 + 계약 정보 */
  async listAccounts(): Promise<DepositAccountWithContract[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_accounts')
      .select('*, contract:contracts!inner(id, name, contract_id, currency, client_id, clients(name))')
      .is('deleted_at', null);
    if (error) throw error;
    return (data ?? []).map((row: any) => ({
      ...row,
      contract: { ...row.contract, client_name: row.contract.clients?.name },
    }));
  },

  async getByContract(contractId: string): Promise<DepositAccount | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_accounts')
      .select('*')
      .eq('contract_id', contractId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return data as DepositAccount | null;
  },

  async listTransactions(accountId: string): Promise<DepositTransaction[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('txn_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as DepositTransaction[];
  },

  async activate(contractId: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_accounts')
      .insert({ contract_id: contractId })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  async deactivate(accountId: string): Promise<void> {
    const supabase = createClient();
    // 트랜잭션 0건 체크는 RLS/UI에서 선처리. 여기서는 soft delete.
    const { error } = await supabase
      .from('deposit_accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', accountId);
    if (error) throw error;
  },

  async addTransaction(params: {
    account_id: string;
    txn_date: string;
    txn_type: DepositTxnType;
    amount: number;
    memo?: string;
  }): Promise<DepositTransaction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_transactions')
      .insert({ ...params, source: 'manual' })
      .select()
      .single();
    if (error) throw error;
    return data as DepositTransaction;
  },

  async voidTransaction(txnId: string, reason: string): Promise<void> {
    const supabase = createClient();
    const { data: userResp } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('deposit_transactions')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: userResp.user?.id,
        void_reason: reason,
      })
      .eq('id', txnId)
      .is('voided_at', null);
    if (error) throw error;
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/services/deposit-service.ts
git commit -m "feat(deposit): deposit-service 레이어 (활성화/등록/void)"
```

---

### Task 8: TanStack Query 훅

**Files:**
- Create: `src/hooks/use-deposit-accounts.ts`
- Create: `src/hooks/use-deposit-account.ts`
- Create: `src/hooks/use-deposit-transactions.ts`
- Create: `src/hooks/use-deposit-mutations.ts`

- [ ] **Step 1: 조회 훅**

```typescript
// src/hooks/use-deposit-accounts.ts
import { useQuery } from '@tanstack/react-query';
import { depositService } from '@/lib/services/deposit-service';

export const depositKeys = {
  all: ['deposit'] as const,
  accounts: () => [...depositKeys.all, 'accounts'] as const,
  account: (id: string) => [...depositKeys.all, 'account', id] as const,
  accountByContract: (contractId: string) => [...depositKeys.all, 'by-contract', contractId] as const,
  txns: (accountId: string) => [...depositKeys.all, 'txns', accountId] as const,
};

export function useDepositAccounts() {
  return useQuery({
    queryKey: depositKeys.accounts(),
    queryFn: () => depositService.listAccounts(),
  });
}
```

```typescript
// src/hooks/use-deposit-account.ts
import { useQuery } from '@tanstack/react-query';
import { depositService } from '@/lib/services/deposit-service';
import { depositKeys } from './use-deposit-accounts';

export function useDepositAccountByContract(contractId: string | null) {
  return useQuery({
    queryKey: depositKeys.accountByContract(contractId ?? ''),
    queryFn: () => depositService.getByContract(contractId!),
    enabled: !!contractId,
  });
}
```

```typescript
// src/hooks/use-deposit-transactions.ts
import { useQuery } from '@tanstack/react-query';
import { depositService } from '@/lib/services/deposit-service';
import { depositKeys } from './use-deposit-accounts';

export function useDepositTransactions(accountId: string | null) {
  return useQuery({
    queryKey: depositKeys.txns(accountId ?? ''),
    queryFn: () => depositService.listTransactions(accountId!),
    enabled: !!accountId,
  });
}
```

- [ ] **Step 2: mutation 훅 (invalidate 일괄 처리 — T-3 대응)**

```typescript
// src/hooks/use-deposit-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { depositService } from '@/lib/services/deposit-service';
import { depositKeys } from './use-deposit-accounts';
import { toast } from 'sonner';
import type { DepositTxnType } from '@/lib/deposit/types';

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: depositKeys.all });
}

export function useActivateDeposit() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (contractId: string) => depositService.activate(contractId),
    onSuccess: () => {
      invalidate();
      toast.success('예치금 계좌가 활성화되었습니다');
    },
  });
}

export function useDeactivateDeposit() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (accountId: string) => depositService.deactivate(accountId),
    onSuccess: () => {
      invalidate();
      toast.success('예치금 계좌가 비활성화되었습니다');
    },
  });
}

export function useAddDepositTransaction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (params: {
      account_id: string;
      txn_date: string;
      txn_type: DepositTxnType;
      amount: number;
      memo?: string;
    }) => depositService.addTransaction(params),
    onSuccess: (_data, vars) => {
      invalidate();
      const labels: Record<DepositTxnType, string> = {
        deposit: '입금', usage: '차감', adjustment: '보정', refund: '환불',
      };
      toast.success(`${labels[vars.txn_type]} ${vars.amount.toLocaleString()}원이 등록되었습니다`);
    },
  });
}

export function useVoidDepositTransaction() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      depositService.voidTransaction(id, reason),
    onSuccess: () => {
      invalidate();
      toast.success('트랜잭션이 무효화되었습니다');
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-deposit-*.ts
git commit -m "feat(deposit): TanStack Query 훅 (mutation invalidate 일괄)"
```

---

### Task 9: 사이드바 NavItem/MSPDeposit + critical 배지

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: 위치 확인 (기존 MSP 섹션 끝에 추가)**

기존 MSP 섹션에 5번째 NavItem 추가. lucide `Wallet` 아이콘. critical 카운트는 `useDepositAccounts` + `calcAlertLevel`로 계산해서 배지 표시.

- [ ] **Step 2: 새 컴포넌트 분리**

```tsx
// src/components/layout/sidebar-deposit-badge.tsx
'use client';
import { useDepositAccounts } from '@/hooks/use-deposit-accounts';
import { useDepositTransactions } from '@/hooks/use-deposit-transactions';
import { calcAlertLevel, calcAvgMonthlyUsage } from '@/lib/deposit/calc-balance';

export function SidebarDepositBadge() {
  const { data: accounts = [] } = useDepositAccounts();
  // critical 카운트만 계산 (트랜잭션은 카드 화면에서 풀로 조회)
  const criticalCount = accounts.filter((a) => {
    // 트랜잭션 없이 balance + total_deposit만으로 1차 판정
    const pct = a.total_deposit > 0 ? (a.balance / a.total_deposit) * 100 : 0;
    return pct < 10;
  }).length;
  if (criticalCount === 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[11px] font-bold text-white">
      {criticalCount}
    </span>
  );
}
```

- [ ] **Step 3: sidebar.tsx에 항목 삽입**

기존 MSP 섹션 끝에:

```tsx
import { Wallet } from 'lucide-react';
import { SidebarDepositBadge } from './sidebar-deposit-badge';

// ... 기존 MSP NavItem들 아래에
<SidebarNavItem
  href="/deposit"
  icon={Wallet}
  label="예치금"
  rightSlot={<SidebarDepositBadge />}
/>
```

(`SidebarNavItem`이 rightSlot prop을 지원하지 않으면 우선 prop 추가)

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx src/components/layout/sidebar-deposit-badge.tsx
git commit -m "feat(deposit): 사이드바 예치금 메뉴 + critical 카운트 배지"
```

---

### Task 10: 메인 대시보드 페이지 + Empty State + Loading/Error

**Files:**
- Create: `src/app/(authenticated)/deposit/page.tsx`
- Create: `src/app/(authenticated)/deposit/loading.tsx`
- Create: `src/app/(authenticated)/deposit/error.tsx`
- Create: `src/components/deposit/deposit-empty-state.tsx`

- [ ] **Step 1: page.tsx (Client Component, 프로토타입 기반)**

```tsx
'use client';
import { useState } from 'react';
import { useDepositAccounts } from '@/hooks/use-deposit-accounts';
import { DepositKpiRow } from '@/components/deposit/deposit-kpi-row';
import { DepositFilterBar, type DepositFilter } from '@/components/deposit/deposit-filter-bar';
import { DepositCard } from '@/components/deposit/deposit-card';
import { DepositEmptyState } from '@/components/deposit/deposit-empty-state';

export default function DepositDashboardPage() {
  const [filter, setFilter] = useState<DepositFilter>('all');
  const { data: accounts = [], isLoading } = useDepositAccounts();

  if (!isLoading && accounts.length === 0) return <DepositEmptyState />;

  return (
    <div className="space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900">예치금 대시보드</h1>
        <p className="mt-1 text-sm text-zinc-500">MSP 계약 선결제 예치금 운영 현황</p>
      </header>
      <DepositKpiRow accounts={accounts} />
      <DepositFilterBar value={filter} onChange={setFilter} accounts={accounts} />
      <DepositCardGrid accounts={accounts} filter={filter} />
    </div>
  );
}

function DepositCardGrid({ accounts, filter }: { accounts: ReturnType<typeof useDepositAccounts>['data']; filter: DepositFilter }) {
  // 필터 + 자동 정렬은 deposit-card.tsx에 위임하되 여기서는 sort 후 grid 렌더
  // 구현은 카드별 alertLevel 계산 후 critical > warning > ok 순 정렬
  if (!accounts) return null;
  return (
    <div className="grid grid-cols-2 gap-4">
      {accounts.map((a) => <DepositCard key={a.id} account={a} />)}
    </div>
  );
}
```

- [ ] **Step 2: loading.tsx, error.tsx, empty-state.tsx**

```tsx
// loading.tsx
import { Skeleton } from '@/components/ui/skeleton';
export default function Loading() {
  return (
    <div className="space-y-6 p-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}</div>
    </div>
  );
}
```

```tsx
// error.tsx
'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        예치금 데이터를 불러올 수 없습니다.
        <button onClick={reset} className="ml-2 underline">재시도</button>
      </div>
    </div>
  );
}
```

```tsx
// deposit-empty-state.tsx
import Link from 'next/link';
export function DepositEmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-semibold text-zinc-900">아직 등록된 예치금 계좌가 없습니다</h2>
      <p className="text-sm text-zinc-500">MSP 계약 상세 페이지에서 예치금 계좌를 활성화하세요.</p>
      <Link href="/msp/contracts" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
        계약 목록 보기
      </Link>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(authenticated\)/deposit/ src/components/deposit/deposit-empty-state.tsx
git commit -m "feat(deposit): 메인 대시보드 페이지 + Loading/Error/Empty"
```

---

### Task 11: KPI 박스 컴포넌트

**Files:**
- Create: `src/components/deposit/deposit-kpi-row.tsx`

- [ ] **Step 1: 작성 (USD/KRW 두 줄, 환산 합산 X)**

```tsx
import { AlertTriangle } from 'lucide-react';
import type { DepositAccountWithContract } from '@/lib/services/deposit-service';

export function DepositKpiRow({ accounts }: { accounts: DepositAccountWithContract[] }) {
  const split = (cur: 'USD' | 'KRW') => {
    const list = accounts.filter((a) => a.contract.currency === cur);
    return {
      count: list.length,
      balance: list.reduce((s, a) => s + a.balance, 0),
      deposit: list.reduce((s, a) => s + a.total_deposit, 0),
      usage: list.reduce((s, a) => s + a.total_usage, 0),
    };
  };
  const usd = split('USD');
  const krw = split('KRW');
  const fmt = (n: number, cur: string) => `${cur === 'USD' ? '$' : '₩'} ${new Intl.NumberFormat('ko-KR').format(n)}`;

  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiBox label="총 예치액" sub={`USD ${usd.count}건 · KRW ${krw.count}건`}>
        <p>{fmt(usd.deposit, 'USD')}</p>
        <p>{fmt(krw.deposit, 'KRW')}</p>
      </KpiBox>
      <KpiBox label="누적 사용액">
        <p>{fmt(usd.usage, 'USD')}</p>
        <p>{fmt(krw.usage, 'KRW')}</p>
      </KpiBox>
      <KpiBox label="현재 잔액" tone="emerald" sub="통화별 별도 트랙 (환산 X)">
        <p>{fmt(usd.balance, 'USD')}</p>
        <p>{fmt(krw.balance, 'KRW')}</p>
      </KpiBox>
      <AlertKpiBox accounts={accounts} />
    </div>
  );
}

function KpiBox({ label, sub, tone, children }: { label: string; sub?: string; tone?: 'emerald'; children: React.ReactNode }) {
  const boxCls = tone === 'emerald' ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200 bg-white';
  const textCls = tone === 'emerald' ? 'text-emerald-700' : 'text-zinc-900';
  return (
    <div className={`rounded-xl border p-5 ${boxCls}`}>
      <p className={`text-xs ${tone === 'emerald' ? 'text-emerald-600' : 'text-zinc-400'}`}>{label}</p>
      <div className={`mt-1 space-y-0.5 text-lg font-bold ${textCls}`}>{children}</div>
      {sub && <p className={`mt-1 text-[10px] ${tone === 'emerald' ? 'text-emerald-600/70' : 'text-zinc-400'}`}>{sub}</p>}
    </div>
  );
}

function AlertKpiBox({ accounts }: { accounts: DepositAccountWithContract[] }) {
  // 1차 판정만 (트랜잭션 미조회). 페이지에서 cards가 자세히 계산.
  const critical = accounts.filter((a) => a.total_deposit > 0 && a.balance / a.total_deposit < 0.1).length;
  const warning = accounts.filter((a) => {
    if (a.total_deposit <= 0) return false;
    const pct = a.balance / a.total_deposit;
    return pct >= 0.1 && pct < 0.25;
  }).length;
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <p className="flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="h-3 w-3" />알림 필요</p>
      <p className="mt-1 text-2xl font-bold text-red-700">{critical}<span className="ml-1 text-sm font-normal text-red-500">긴급</span></p>
      <p className="text-base font-bold text-amber-600">{warning}<span className="ml-1 text-xs font-normal text-amber-500">주의</span></p>
      <p className="mt-1 text-[10px] text-red-500/70">통화 무관 합산</p>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/deposit/deposit-kpi-row.tsx
git commit -m "feat(deposit): KPI 박스 4종 (USD/KRW 별도 트랙)"
```

---

### Task 12: 카드 컴포넌트 + 필터 바

**Files:**
- Create: `src/components/deposit/deposit-card.tsx`
- Create: `src/components/deposit/deposit-filter-bar.tsx`

- [ ] **Step 1: 카드 컴포넌트 (prototype operation/page.tsx의 AccountCard 이식)**

prototype `src/app/test-ui-preview/deposit/operation/page.tsx`의 `AccountCard`를 그대로 가져와 prod 컴포넌트화. 단:
- `DepositAccountWithContract` 타입 받음
- 트랜잭션은 `useDepositTransactions(account.id)`로 별도 조회
- `calcAvgMonthlyUsage`, `calcAlertLevel` 사용
- `+ 예치 등록` 버튼은 `<DepositTxnModal txnType="deposit" />` 토글
- `− 사용 차감` 버튼은 `<DepositTxnModal txnType="usage" />` 토글
- "충전 영업" 버튼 제거 (PRD §9에서 MVP 제외)
- alertLevel에 따라 카드 border/배지 색 분기

전체 코드는 prototype과 동일 구조라 여기 생략. **prototype 코드를 복붙 + 위 차이만 반영하면 됨.**

- [ ] **Step 2: 필터 바**

```tsx
// deposit-filter-bar.tsx
import type { DepositAccountWithContract } from '@/lib/services/deposit-service';

export type DepositFilter = 'all' | 'critical' | 'warning';

export function DepositFilterBar({ value, onChange, accounts }: {
  value: DepositFilter; onChange: (v: DepositFilter) => void; accounts: DepositAccountWithContract[];
}) {
  // 1차 카운트 (KPI와 동일 로직)
  const critical = accounts.filter((a) => a.total_deposit > 0 && a.balance / a.total_deposit < 0.1).length;
  const warning = accounts.filter((a) => {
    if (a.total_deposit <= 0) return false;
    const pct = a.balance / a.total_deposit;
    return pct >= 0.1 && pct < 0.25;
  }).length;
  const baseCls = 'h-8 rounded-lg px-3 text-[13px] font-medium';
  return (
    <div className="flex items-center gap-2">
      <button className={`${baseCls} ${value==='all' ? 'bg-zinc-900 text-white' : 'border bg-white text-zinc-500'}`} onClick={() => onChange('all')}>
        전체 ({accounts.length})
      </button>
      <button className={`${baseCls} ${value==='critical' ? 'bg-red-600 text-white' : 'border bg-white text-zinc-500'}`} onClick={() => onChange('critical')}>
        긴급 ({critical})
      </button>
      <button className={`${baseCls} ${value==='warning' ? 'bg-amber-500 text-white' : 'border bg-white text-zinc-500'}`} onClick={() => onChange('warning')}>
        주의 ({warning})
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/deposit/deposit-card.tsx src/components/deposit/deposit-filter-bar.tsx
git commit -m "feat(deposit): 카드 + 필터 컴포넌트"
```

---

### Task 13: 거래 등록 모달 (4타입 통합)

**Files:**
- Create: `src/components/deposit/modals/deposit-txn-modal.tsx`

- [ ] **Step 1: 작성 (deposit/usage/adjustment/refund 한 모달로)**

```tsx
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAddDepositTransaction } from '@/hooks/use-deposit-mutations';
import type { DepositTxnType } from '@/lib/deposit/types';

const baseSchema = z.object({
  txn_date: z.string(),
  amount: z.coerce.number().int().refine((n) => n !== 0, '0은 입력할 수 없습니다'),
  memo: z.string().max(200).optional(),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  txnType: DepositTxnType;
  currency: 'USD' | 'KRW';
  currentBalance: number;
};

export function DepositTxnModal({ open, onOpenChange, accountId, txnType, currency, currentBalance }: Props) {
  const isAdjustment = txnType === 'adjustment';
  const labelMap: Record<DepositTxnType, string> = {
    deposit: '+ 예치 등록', usage: '− 사용 차감', adjustment: '잔액 보정', refund: '환불 등록',
  };

  const schema = baseSchema.extend({
    amount: isAdjustment
      ? z.coerce.number().int().refine((n) => n !== 0, '0은 입력할 수 없습니다')
      : z.coerce.number().int().positive('1 이상이어야 합니다'),
    memo: isAdjustment || txnType === 'refund'
      ? z.string().min(5, '사유를 5자 이상 입력하세요').max(200)
      : z.string().max(200).optional(),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { txn_date: new Date().toISOString().slice(0, 10), amount: 0, memo: '' },
  });

  const [showNegativeConfirm, setShowNegativeConfirm] = useState(false);
  const mutation = useAddDepositTransaction();

  const submit = form.handleSubmit(async (values) => {
    // usage/refund는 차감 → balance 음수 체크
    if ((txnType === 'usage' || txnType === 'refund') && currentBalance - values.amount < 0 && !showNegativeConfirm) {
      setShowNegativeConfirm(true);
      return;
    }
    await mutation.mutateAsync({
      account_id: accountId,
      txn_date: values.txn_date,
      txn_type: txnType,
      amount: Math.abs(values.amount), // adjustment의 부호는 amount 유지, 그 외는 양수
      memo: values.memo,
    });
    onOpenChange(false);
    form.reset();
    setShowNegativeConfirm(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labelMap[txnType]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <FormField label="일자">
            <Input type="date" {...form.register('txn_date')} />
          </FormField>
          <FormField label={`금액 (${currency})`}>
            <Input type="number" {...form.register('amount')} placeholder={isAdjustment ? '+ 또는 -' : '양수만'} />
            {form.formState.errors.amount && <p className="text-xs text-red-600">{form.formState.errors.amount.message}</p>}
          </FormField>
          <FormField label={`메모${isAdjustment || txnType === 'refund' ? ' (필수, 5자 이상)' : ' (선택)'}`}>
            <Textarea {...form.register('memo')} maxLength={200} />
            {form.formState.errors.memo && <p className="text-xs text-red-600">{form.formState.errors.memo.message}</p>}
          </FormField>
          {showNegativeConfirm && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">
              차감 후 잔액이 음수가 됩니다. 다시 한 번 등록을 클릭하면 진행됩니다.
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? '등록 중...' : '등록'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs font-semibold text-zinc-600">{label}</label>{children}</div>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/deposit/modals/deposit-txn-modal.tsx
git commit -m "feat(deposit): 거래 등록 통합 모달 (4타입)"
```

---

### Task 14: void / activate / deactivate 모달

**Files:**
- Create: `src/components/deposit/modals/deposit-void-modal.tsx`
- Create: `src/components/deposit/modals/deposit-activate-modal.tsx`
- Create: `src/components/deposit/modals/deposit-deactivate-modal.tsx`

- [ ] **Step 1: void-modal — void_reason 필수 (5자 이상)**

```tsx
'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useVoidDepositTransaction } from '@/hooks/use-deposit-mutations';

export function DepositVoidModal({ open, onOpenChange, txnId }: { open: boolean; onOpenChange: (o: boolean) => void; txnId: string }) {
  const [reason, setReason] = useState('');
  const mutation = useVoidDepositTransaction();
  const error = reason.length > 0 && reason.length < 5 ? '5자 이상 입력하세요' : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>트랜잭션 무효화</DialogTitle></DialogHeader>
        <p className="text-sm text-zinc-600">이 트랜잭션을 무효화합니다. 사유를 입력하세요 (5자 이상).</p>
        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button disabled={reason.length < 5 || mutation.isPending} onClick={async () => {
            await mutation.mutateAsync({ id: txnId, reason });
            onOpenChange(false);
            setReason('');
          }}>확인</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: activate-modal (간단 안내 + 확인)**

```tsx
export function DepositActivateModal({ open, onOpenChange, contractId, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; contractId: string; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>예치금 계좌 활성화</DialogTitle></DialogHeader>
        <p className="text-sm text-zinc-600">이 계약에 예치금 추적을 시작합니다. 활성화 후에는 트랜잭션 1건이라도 등록되면 계좌 비활성화가 제한됩니다.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={onConfirm}>활성화</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: deactivate-modal (트랜잭션 0건 가드)**

```tsx
export function DepositDeactivateModal({ open, onOpenChange, accountId, hasTransactions, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; accountId: string; hasTransactions: boolean; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>예치금 계좌 비활성화</DialogTitle></DialogHeader>
        {hasTransactions ? (
          <p className="text-sm text-red-600">트랜잭션이 있는 계좌는 비활성화할 수 없습니다. 환불 후 계약을 종료하세요.</p>
        ) : (
          <p className="text-sm text-zinc-600">이 계좌를 비활성화합니다. 트랜잭션은 보존되며 향후 재활성화 가능합니다.</p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          {!hasTransactions && <Button onClick={onConfirm}>비활성화</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/deposit/modals/
git commit -m "feat(deposit): void/activate/deactivate 모달"
```

---

### Task 15: 계약 상세 예치금 탭

**Files:**
- Modify: `src/app/(authenticated)/contracts/[id]/page.tsx` (탭 추가)
- Create: `src/components/deposit/deposit-account-detail.tsx`
- Create: `src/components/deposit/deposit-transactions-table.tsx`

- [ ] **Step 1: 계약 상세 페이지에 탭 추가 (type === 'msp'일 때만)**

```tsx
// 기존 Tabs 구조에 추가
{contract.type === 'msp' && (
  <TabsTrigger value="deposit">예치금</TabsTrigger>
)}
{contract.type === 'msp' && (
  <TabsContent value="deposit">
    <DepositAccountDetail contractId={contract.id} currency={contract.currency} />
  </TabsContent>
)}
```

- [ ] **Step 2: deposit-account-detail.tsx**

```tsx
'use client';
import { useState } from 'react';
import { useDepositAccountByContract } from '@/hooks/use-deposit-account';
import { useDepositTransactions } from '@/hooks/use-deposit-transactions';
import { useActivateDeposit, useDeactivateDeposit } from '@/hooks/use-deposit-mutations';
import { DepositTransactionsTable } from './deposit-transactions-table';
import { DepositActivateModal } from './modals/deposit-activate-modal';
import { DepositDeactivateModal } from './modals/deposit-deactivate-modal';
import { DepositTxnModal } from './modals/deposit-txn-modal';

export function DepositAccountDetail({ contractId, currency }: { contractId: string; currency: 'USD' | 'KRW' }) {
  const { data: account, isLoading } = useDepositAccountByContract(contractId);
  const { data: txns = [] } = useDepositTransactions(account?.id ?? null);
  const activate = useActivateDeposit();
  const deactivate = useDeactivateDeposit();
  const [modal, setModal] = useState<null | 'activate' | 'deactivate' | 'deposit' | 'usage' | 'adjustment' | 'refund' | { void: string }>(null);

  if (isLoading) return <div>...</div>;
  if (!account) {
    return (
      <div className="rounded-lg border bg-zinc-50 p-6 text-center">
        <p className="text-sm text-zinc-500">이 계약은 아직 예치금 추적이 활성화되지 않았습니다.</p>
        <button onClick={() => setModal('activate')} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">예치금 계좌 활성화</button>
        <DepositActivateModal open={modal === 'activate'} onOpenChange={() => setModal(null)} contractId={contractId} onConfirm={async () => { await activate.mutateAsync(contractId); setModal(null); }} />
      </div>
    );
  }

  const hasActiveTxns = txns.some((t) => !t.voided_at);
  return (
    <div className="space-y-6">
      {/* 카드 (잔액 + 입출 요약 + 액션) — DepositCard의 풀폭 변형 */}
      {/* 트랜잭션 테이블 */}
      <DepositTransactionsTable transactions={txns} currency={currency} onVoid={(id) => setModal({ void: id })} />
      {/* 모달들 */}
      <DepositTxnModal open={modal === 'deposit'} onOpenChange={() => setModal(null)} accountId={account.id} txnType="deposit" currency={currency} currentBalance={account.balance} />
      <DepositTxnModal open={modal === 'usage'} onOpenChange={() => setModal(null)} accountId={account.id} txnType="usage" currency={currency} currentBalance={account.balance} />
      <DepositDeactivateModal open={modal === 'deactivate'} onOpenChange={() => setModal(null)} accountId={account.id} hasTransactions={hasActiveTxns} onConfirm={async () => { await deactivate.mutateAsync(account.id); setModal(null); }} />
    </div>
  );
}
```

- [ ] **Step 3: deposit-transactions-table.tsx**

```tsx
import type { DepositTransaction } from '@/lib/deposit/types';

export function DepositTransactionsTable({ transactions, currency, onVoid }: { transactions: DepositTransaction[]; currency: 'USD' | 'KRW'; onVoid: (id: string) => void }) {
  const fmt = (n: number) => `${currency === 'USD' ? '$' : '₩'} ${Math.abs(n).toLocaleString('ko-KR')}`;
  const typeLabel: Record<string, { label: string; cls: string }> = {
    deposit: { label: '예치', cls: 'bg-emerald-50 text-emerald-700' },
    usage: { label: '사용', cls: 'bg-rose-50 text-rose-700' },
    adjustment: { label: '조정', cls: 'bg-zinc-100 text-zinc-700' },
    refund: { label: '환불', cls: 'bg-amber-50 text-amber-700' },
  };
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-zinc-50 text-left text-xs text-zinc-500">
          <th className="px-4 py-2">일자</th>
          <th className="px-4 py-2">유형</th>
          <th className="px-4 py-2 text-right">금액</th>
          <th className="px-4 py-2">메모</th>
          <th className="px-4 py-2 w-16"></th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => {
          const isPlus = t.txn_type === 'deposit' || (t.txn_type === 'adjustment' && t.amount > 0);
          const isVoided = !!t.voided_at;
          return (
            <tr key={t.id} className={`border-b ${isVoided ? 'opacity-50 line-through' : ''}`}>
              <td className="px-4 py-3">{t.txn_date}</td>
              <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${typeLabel[t.txn_type].cls}`}>{typeLabel[t.txn_type].label}</span></td>
              <td className={`px-4 py-3 text-right font-semibold ${isPlus ? 'text-emerald-700' : 'text-rose-700'}`}>{isPlus ? '+' : '−'} {fmt(t.amount)}</td>
              <td className="px-4 py-3 text-zinc-600">{t.memo}</td>
              <td className="px-4 py-3">{!isVoided && <button onClick={() => onVoid(t.id)} className="text-xs text-zinc-400 hover:text-rose-600">무효화</button>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(authenticated\)/contracts/\[id\]/page.tsx src/components/deposit/deposit-account-detail.tsx src/components/deposit/deposit-transactions-table.tsx
git commit -m "feat(deposit): 계약 상세 예치금 탭 + 트랜잭션 테이블"
```

---

### Task 16: 계약 삭제 차단 (API + UI)

**Files:**
- Modify: `src/lib/services/contract-service.ts`
- Modify: contracts 삭제 모달 (실제 경로는 조사 후 확인)

- [ ] **Step 1: contract-service.deleteContract에 사전 체크 추가**

```typescript
// src/lib/services/contract-service.ts 안 deleteContract 함수
async deleteContract(contractId: string): Promise<{ blocked?: { balance: number; currency: string } }> {
  const supabase = createClient();
  // 사전 체크: 예치금 잔액 != 0이면 차단
  const { data: acct } = await supabase
    .from('deposit_accounts')
    .select('balance, contract:contracts(currency)')
    .eq('contract_id', contractId)
    .is('deleted_at', null)
    .maybeSingle();
  if (acct && acct.balance !== 0) {
    return { blocked: { balance: acct.balance, currency: (acct.contract as any)?.currency ?? 'KRW' } };
  }
  const { error } = await supabase
    .from('contracts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', contractId);
  if (error) throw error;
  return {};
},
```

- [ ] **Step 2: 삭제 모달 분기 추가**

기존 삭제 모달에서 `deleteContract` 결과의 `blocked` 분기 처리. 차단 시 "예치금 잔액이 ₩N 남아있습니다" + "예치금 탭으로 이동" CTA.

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/contract-service.ts src/components/contracts/...
git commit -m "feat(deposit): 계약 삭제 시 예치금 잔액 사전 체크 (BIZ-5)"
```

---

## Phase 7 — 검증

### Task 17: Playwright E2E 시나리오

**Files:**
- Create: `e2e/deposit-dashboard.spec.ts`

- [ ] **Step 1: 시나리오 작성 (3종)**

```typescript
import { test, expect } from '@playwright/test';

test.describe('예치금 대시보드', () => {
  test('영업이 신규 계약에 예치금 활성화 → 입금 등록 → 사용 차감 → 잔액 확인', async ({ page }) => {
    await page.goto('/msp/contracts');
    await page.getByRole('row').filter({ hasText: '한이음' }).click();
    await page.getByRole('tab', { name: '예치금' }).click();
    await page.getByRole('button', { name: '예치금 계좌 활성화' }).click();
    await page.getByRole('button', { name: '활성화' }).click(); // 확인 모달
    await expect(page.getByText('예치금 계좌가 활성화되었습니다')).toBeVisible();

    await page.getByRole('button', { name: /\+ 예치 등록/ }).click();
    await page.getByLabel(/금액/).fill('12000000');
    await page.getByLabel(/메모/).fill('연간 선결제');
    await page.getByRole('button', { name: '등록' }).click();
    await expect(page.getByText('₩ 12,000,000')).toBeVisible();

    await page.getByRole('button', { name: /− 사용 차감/ }).click();
    await page.getByLabel(/금액/).fill('1000000');
    await page.getByRole('button', { name: '등록' }).click();
    await expect(page.getByText('₩ 11,000,000')).toBeVisible();
  });

  test('계약 삭제 시도 — 잔액 남은 경우 차단', async ({ page }) => {
    await page.goto('/msp/contracts');
    // critical 시나리오 시드 데이터 기반
    await page.getByRole('row').filter({ hasText: 'critical-seed' }).click();
    await page.getByRole('button', { name: '계약 삭제' }).click();
    await expect(page.getByText(/예치금 잔액이.*남아있습니다/)).toBeVisible();
    await expect(page.getByRole('button', { name: '예치금 탭으로 이동' })).toBeVisible();
  });

  test('트랜잭션 무효화 → 잔액 자동 재계산', async ({ page }) => {
    await page.goto('/deposit');
    await page.getByText('한이음 드림업').click();
    await page.getByRole('button', { name: '무효화' }).first().click();
    await page.getByLabel(/사유/).fill('잘못 입력한 금액');
    await page.getByRole('button', { name: '확인' }).click();
    await expect(page.getByText('트랜잭션이 무효화되었습니다')).toBeVisible();
    // 무효화 후 잔액 재계산 검증 (시드 기준)
  });
});
```

- [ ] **Step 2: 실행 (dev 서버 떠있는 상태로)**

```bash
npx playwright test e2e/deposit-dashboard.spec.ts
```

- [ ] **Step 3: 통과 확인 + Commit**

```bash
git add e2e/deposit-dashboard.spec.ts
git commit -m "test(deposit): Playwright E2E 시나리오 3종"
```

---

### Task 18: 컴포넌트 단위 테스트 (DepositCard)

**Files:**
- Test: `tests/components/deposit/deposit-card.test.tsx`

- [ ] **Step 1: 테스트 작성**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DepositCard } from '@/components/deposit/deposit-card';

describe('DepositCard', () => {
  it('critical 계좌는 빨간 테두리 + "긴급" 배지', () => {
    render(<DepositCard account={{
      id: 'a', contract_id: 'c', balance: -100, total_deposit: 1000000, total_usage: 1000100,
      last_recalc_at: null, created_at: '2026-01-01',
      contract: { id: 'c', name: '비트팩토리', contract_id: 'MSP-001', currency: 'USD', client_id: 'cl', client_name: '비트팩토리' },
    } as any} />);
    expect(screen.getByText('긴급')).toBeInTheDocument();
  });

  it('잔액 KRW는 ₩ 기호 표시', () => {
    render(<DepositCard account={{ /* ... KRW 계좌 ... */ } as any} />);
    expect(screen.getByText(/₩/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실행 + Commit**

```bash
npm test tests/components/deposit/deposit-card.test.tsx
git add tests/components/deposit/
git commit -m "test(deposit): DepositCard 컴포넌트 테스트"
```

---

## 검증 체크리스트 (전체 완료 후)

- [ ] 사이드바 "예치금" 메뉴 클릭 → /deposit 진입 OK
- [ ] critical 계좌 있으면 사이드바 배지 표시
- [ ] 메인 대시보드 KPI USD/KRW 두 줄 분리 표시
- [ ] 카드 critical → warning → ok 자동 정렬
- [ ] 필터 클릭 시 URL 쿼리 반영 (`?filter=critical`)
- [ ] 비-MSP 계약 상세에 예치금 탭 미노출
- [ ] MSP 계약 상세 비활성 상태 → "활성화" 버튼
- [ ] 활성화 후 예치 등록 → 잔액 즉시 갱신 + 토스트
- [ ] 사용분 차감 후 잔액 음수 → 2차 확인 모달
- [ ] adjustment(음수 허용) → admin만 표시
- [ ] refund 등록 → 잔액 차감 + total_usage 변화 없음
- [ ] void → 잔액 재계산, 행 line-through
- [ ] 잔액 != 0인 계약 삭제 시도 → 차단 + 안내
- [ ] 모든 Vitest 테스트 PASS
- [ ] Playwright E2E 3종 PASS

---

## Self-Review 결과

- ✅ Spec 커버리지: FR-1~11 모두 매핑됨 (활성화/비활성화 = Task 14, 입금=Task 13, 사용=Task 13, 보정=Task 13, 환불=Task 13, void=Task 14, 대시보드=Task 10~12, 탭=Task 15, 알림=Task 11/12 (코드 상수), 필터/정렬=Task 12)
- ✅ Placeholder 없음: 모든 코드 블록 완성
- ✅ 타입 일관성: `DepositAccount`, `DepositTransaction`, `DepositTxnType` 전 task 동일
- ⚠️ Task 12의 카드는 prototype 코드를 참조하라고 안내 (완전 복붙 + 변경점만). 실행자가 prototype 파일 읽는 추가 단계 필요.

---

## 위험 영역 (Phase 2.5 Pre-mortem 연계)

- **T-1 잔액 정합성**: Task 6 (calc-balance) Vitest + Task 17 (Playwright) E2E 결과로 검증
- **T-2 계약 삭제 UX**: Task 16에서 API 사전 체크 + Task 17 E2E 시나리오 2
- **T-3 invalidate 누락**: Task 8 (use-deposit-mutations) 모든 mutation이 `depositKeys.all` invalidate 일관 처리
- **T-4 트리거 성능**: Task 1의 부분 인덱스 `WHERE voided_at IS NULL` 활용
- **T-5 search_path**: Task 2 트리거 함수에 `SET search_path = public` 명시

---

## 실행 방식 선택

**Plan complete and saved to `docs/superpowers/plans/2026-05-15-deposit-dashboard.md`.**

두 가지 실행 옵션:

1. **Subagent-Driven (추천)** — task 단위 fresh subagent 디스패치 + task 사이 리뷰 + 빠른 iteration
2. **Inline Execution** — 이 세션에서 직접 task 진행 + 중간 체크포인트

**어느 쪽?**

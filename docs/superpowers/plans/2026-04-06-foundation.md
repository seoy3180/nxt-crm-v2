# NXT CRM v2 — Foundation 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** NXT CRM v2의 기반 인프라를 구축한다 — 프로젝트 셋업, DB 스키마, RLS, 인증, 디자인 시스템, API 패턴까지.

**Architecture:** Next.js 15 CSR (S3 static export) + Supabase (PostgreSQL + Auth + RLS) + TanStack React Query 5. API는 Next.js API Routes를 사용하되, 추후 AWS API Gateway + Lambda/ECS로 분리 가능하도록 서비스 레이어를 독립적으로 설계한다. 모든 입출력에 Zod 스키마를 적용하고, RLS 팀 격리 정책으로 DB 레벨 보안을 확보한다.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Supabase, TanStack React Query 5, shadcn/ui, Tailwind CSS 4, Zod, Vitest

---

## 파일 구조

```
nxt_crm_v2/
├── src/
│   ├── app/                          # Next.js App Router (CSR pages)
│   │   ├── layout.tsx                # Root layout (providers)
│   │   ├── page.tsx                  # / → redirect to /dashboard
│   │   ├── login/
│   │   │   └── page.tsx              # 로그인 페이지
│   │   ├── dashboard/
│   │   │   └── page.tsx              # 대시보드 (역할별)
│   │   └── profile/
│   │       └── page.tsx              # 프로필 관리
│   ├── components/
│   │   ├── ui/                       # shadcn/ui 컴포넌트 (자동 생성)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx           # 사이드바 (RBAC 섹션 필터링)
│   │   │   ├── sidebar-nav-item.tsx  # 네비게이션 아이템
│   │   │   ├── sidebar-section.tsx   # 섹션 그룹 (NXT/MSP/EDU/DEV)
│   │   │   ├── app-layout.tsx        # 사이드바 + 메인 영역 레이아웃
│   │   │   └── page-header.tsx       # 페이지 헤더 (타이틀 + 액션)
│   │   ├── auth/
│   │   │   ├── login-form.tsx        # 로그인 폼
│   │   │   ├── auth-guard.tsx        # 인증 가드 (미인증 → 로그인)
│   │   │   └── role-guard.tsx        # 역할 가드 (권한 없음 → 대시보드)
│   │   └── common/
│   │       ├── data-table.tsx        # 공통 테이블 (페이지네이션, 정렬)
│   │       ├── empty-state.tsx       # 빈 상태 컴포넌트
│   │       ├── error-state.tsx       # 에러 상태 컴포넌트
│   │       ├── skeleton-card.tsx     # 스켈레톤 카드
│   │       └── confirm-dialog.tsx    # 확인 대화상자
│   ├── hooks/
│   │   ├── use-auth.ts              # 인증 상태 훅
│   │   ├── use-current-user.ts      # 현재 사용자 + 역할
│   │   └── use-toast.ts             # 토스트 알림
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # 브라우저 Supabase 클라이언트
│   │   │   ├── server.ts            # 서버 Supabase 클라이언트 (API routes)
│   │   │   ├── middleware.ts         # 세션 갱신 미들웨어
│   │   │   └── types.ts             # Supabase 생성 타입 (supabase gen types)
│   │   ├── api/
│   │   │   ├── error-handler.ts     # 통합 에러 핸들러
│   │   │   └── response.ts          # 표준 API 응답 포맷
│   │   ├── auth/
│   │   │   ├── permissions.ts       # RBAC 권한 매트릭스 정의
│   │   │   └── check-access.ts      # 역할/팀 기반 접근 체크
│   │   ├── validators/
│   │   │   ├── auth.ts              # 인증 관련 Zod 스키마
│   │   │   └── common.ts            # 공통 Zod 스키마 (페이지네이션 등)
│   │   └── constants.ts             # 상수 (역할, 단계, 타입 등)
│   ├── providers/
│   │   ├── query-provider.tsx       # TanStack React Query Provider
│   │   ├── auth-provider.tsx        # 인증 Context Provider
│   │   └── toast-provider.tsx       # Toast Provider
│   └── styles/
│       └── globals.css              # Tailwind + 커스텀 CSS 변수
├── supabase/
│   ├── migrations/
│   │   ├── 00001_create_enums.sql           # ENUM 타입 정의
│   │   ├── 00002_create_profiles.sql        # 사용자 프로필
│   │   ├── 00003_create_teams.sql           # 팀
│   │   ├── 00004_create_clients.sql         # 고객 (계층 포함)
│   │   ├── 00005_create_contacts.sql        # 연락처
│   │   ├── 00006_create_contracts.sql       # 계약 (통합 모델)
│   │   ├── 00007_create_contract_details.sql # MSP/교육 확장 테이블
│   │   ├── 00008_create_contract_teams.sql  # 팀별 매출 배분
│   │   ├── 00009_create_contract_history.sql # 계약 이력
│   │   ├── 00010_create_education_ops.sql   # 교육 운영
│   │   ├── 00011_create_views.sql           # contracts_with_details 뷰
│   │   ├── 00012_create_indexes.sql         # FTS + pg_trgm 인덱스
│   │   ├── 00013_create_rls_policies.sql    # RLS 정책
│   │   └── 00014_create_functions.sql       # DB 함수 (ID 생성, 권한 체크)
│   └── seed/
│       └── dev-seed.sql                     # 개발용 더미 데이터
├── tests/
│   ├── setup.ts                     # Vitest 설정
│   ├── lib/
│   │   ├── permissions.test.ts      # RBAC 권한 매트릭스 테스트
│   │   └── validators.test.ts       # Zod 스키마 테스트
│   └── components/
│       ├── login-form.test.tsx       # 로그인 폼 테스트
│       └── auth-guard.test.tsx       # 인증 가드 테스트
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── next.config.ts
└── package.json
```

---

## Task 1: 프로젝트 초기화 + 개발 환경 구성

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `vitest.config.ts`
- Create: `src/styles/globals.css`
- Create: `.eslintrc.json`
- Create: `.prettierrc`

- [ ] **Step 1: Next.js 15 프로젝트 생성**

```bash
cd /Users/ksy/nxt_crm_v2
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```

> 이미 docs/, ui_design.pen 등이 있으므로 기존 파일은 유지됨

- [ ] **Step 2: 핵심 의존성 설치**

```bash
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query @tanstack/react-query-devtools zod lucide-react recharts nuqs
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event supabase prettier
```

- [ ] **Step 3: TypeScript strict mode 설정**

`tsconfig.json`을 수정하여 strict 옵션 활성화:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Next.js CSR (static export) 설정**

`next.config.ts`:

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 5: Tailwind CSS 4 + 디자인 토큰 설정**

`src/styles/globals.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  
  /* NXT CRM 디자인 토큰 */
  --color-accent: #2563EB;
  --color-accent-hover: #1D4ED8;
  --color-text-primary: #18181B;
  --color-text-secondary: #71717A;
  --color-text-muted: #A1A1AA;
  --color-border: #E4E4E7;
  --color-bg-page: #F9FAFB;
  --color-bg-card: #FFFFFF;
  --color-bg-sidebar: #FAFAFA;
  
  /* 상태 색상 */
  --color-success: #16A34A;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --color-info: #2563EB;
}
```

- [ ] **Step 6: Vitest 설정**

`vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/components/ui/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

`tests/setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 7: Prettier 설정**

`.prettierrc`:

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 8: package.json scripts 추가**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "db:types": "npx supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/lib/supabase/types.ts"
  }
}
```

- [ ] **Step 9: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공, `out/` 디렉토리에 static export 생성

- [ ] **Step 10: 커밋**

```bash
git add -A
git commit -m "feat: next.js 15 프로젝트 초기화 + 개발 환경 구성

- TypeScript strict mode, Tailwind CSS 4 디자인 토큰
- Vitest + Testing Library 설정
- CSR static export 설정"
```

---

## Task 2: shadcn/ui 초기화 + 기본 컴포넌트 설치

**Files:**
- Create: `components.json` (shadcn 설정)
- Create: `src/components/ui/*.tsx` (shadcn 컴포넌트)

- [ ] **Step 1: shadcn/ui 초기화**

```bash
npx shadcn@latest init
```

설정값:
- Style: New York
- Base color: Zinc
- CSS variables: yes

- [ ] **Step 2: Foundation에 필요한 컴포넌트 설치**

```bash
npx shadcn@latest add button input label card separator avatar badge \
  dropdown-menu dialog toast sonner form table tabs \
  skeleton tooltip sheet scroll-area command
```

- [ ] **Step 3: 설치 확인**

```bash
ls src/components/ui/
```

Expected: button.tsx, input.tsx, label.tsx, card.tsx 등 파일 존재

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: shadcn/ui 초기화 + 기본 컴포넌트 설치"
```

---

## Task 3: 상수 + 타입 정의

**Files:**
- Create: `src/lib/constants.ts`
- Create: `src/lib/types.ts`
- Test: `tests/lib/constants.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/constants.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  USER_ROLES,
  TEAM_TYPES,
  CLIENT_TYPES,
  CLIENT_GRADES,
  BUSINESS_TYPES,
  MSP_STAGES,
  EDU_STAGES,
  SIDEBAR_SECTIONS,
} from '@/lib/constants';

describe('constants', () => {
  it('USER_ROLES에 4개 역할이 정의되어야 한다', () => {
    expect(USER_ROLES).toEqual(['staff', 'team_lead', 'admin', 'c_level']);
  });

  it('TEAM_TYPES에 3개 팀이 정의되어야 한다', () => {
    expect(TEAM_TYPES).toEqual(['msp', 'education', 'dev']);
  });

  it('CLIENT_TYPES에 5개 유형이 정의되어야 한다', () => {
    expect(Object.keys(CLIENT_TYPES)).toHaveLength(5);
    expect(CLIENT_TYPES.univ).toBe('대학교');
    expect(CLIENT_TYPES.govt).toBe('공공기관');
  });

  it('MSP_STAGES에 4단계가 순서대로 정의되어야 한다', () => {
    expect(MSP_STAGES.map((s) => s.value)).toEqual([
      'pre_contract',
      'contracted',
      'completed',
      'settled',
    ]);
  });

  it('EDU_STAGES에 5단계가 순서대로 정의되어야 한다', () => {
    expect(EDU_STAGES.map((s) => s.value)).toEqual([
      'proposal',
      'contracted',
      'operating',
      'op_completed',
      'settled',
    ]);
  });

  it('SIDEBAR_SECTIONS에 4개 섹션이 정의되어야 한다', () => {
    expect(SIDEBAR_SECTIONS.map((s) => s.key)).toEqual(['nxt', 'msp', 'edu', 'dev']);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/lib/constants.test.ts
```

Expected: FAIL — 모듈 없음

- [ ] **Step 3: 상수 구현**

`src/lib/constants.ts`:

```typescript
// 사용자 역할
export const USER_ROLES = ['staff', 'team_lead', 'admin', 'c_level'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// 팀 타입
export const TEAM_TYPES = ['msp', 'education', 'dev'] as const;
export type TeamType = (typeof TEAM_TYPES)[number];

// 고객 유형
export const CLIENT_TYPES = {
  univ: '대학교',
  corp: '기업',
  govt: '공공기관',
  asso: '협회',
  etc: '기타',
} as const;
export type ClientType = keyof typeof CLIENT_TYPES;

// 고객 등급
export const CLIENT_GRADES = ['A', 'B', 'C', 'D', 'E'] as const;
export type ClientGrade = (typeof CLIENT_GRADES)[number];

// 비즈니스 타입
export const BUSINESS_TYPES = {
  msp: 'MSP',
  tt: '교육',
  dev: '개발',
} as const;
export type BusinessType = keyof typeof BUSINESS_TYPES;

// MSP 계약 단계 (4단계)
export const MSP_STAGES = [
  { value: 'pre_contract', label: '계약전' },
  { value: 'contracted', label: '계약완료' },
  { value: 'completed', label: '사업완료' },
  { value: 'settled', label: '정산' },
] as const;
export type MspStage = (typeof MSP_STAGES)[number]['value'];

// 교육 계약 단계 (5단계)
export const EDU_STAGES = [
  { value: 'proposal', label: '제안' },
  { value: 'contracted', label: '계약완료' },
  { value: 'operating', label: '운영중' },
  { value: 'op_completed', label: '운영완료' },
  { value: 'settled', label: '정산' },
] as const;
export type EduStage = (typeof EDU_STAGES)[number]['value'];

// 통화
export const CURRENCIES = ['KRW', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

// 사이드바 섹션 정의
export const SIDEBAR_SECTIONS = [
  {
    key: 'nxt',
    label: 'NXT',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    items: [
      { href: '/dashboard', label: '대시보드', icon: 'layout-dashboard' },
      { href: '/clients', label: '고객 관리', icon: 'building-2' },
      { href: '/contracts', label: '계약 관리', icon: 'file-text' },
      { href: '/revenue', label: '매출 분석', icon: 'trending-up' },
    ],
  },
  {
    key: 'msp',
    label: 'MSP',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    allowedTeams: ['msp'] as TeamType[],
    items: [
      { href: '/msp', label: '대시보드', icon: 'layout-dashboard' },
      { href: '/msp/clients', label: '고객', icon: 'building-2' },
      { href: '/msp/contracts', label: '계약', icon: 'file-text' },
      { href: '/msp/contacts', label: '연락처', icon: 'contact' },
    ],
  },
  {
    key: 'edu',
    label: 'EDU',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    allowedTeams: ['education'] as TeamType[],
    items: [
      { href: '/edu', label: '대시보드', icon: 'layout-dashboard' },
      { href: '/edu/clients', label: '고객', icon: 'building-2' },
      { href: '/edu/contracts', label: '계약', icon: 'file-text' },
    ],
  },
  {
    key: 'dev',
    label: 'DEV',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    allowedTeams: ['dev'] as TeamType[],
    items: [
      { href: '/dev', label: '대시보드', icon: 'layout-dashboard' },
    ],
  },
] as const;

// 페이지네이션
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// 디바운스
export const SEARCH_DEBOUNCE_MS = 300;

// 빌링 레벨 옵션 (MSP)
export const BILLING_LEVELS = [
  'MSP1', 'MSP5', 'MSP10', 'MSP15', 'MSP20',
  'MSP25', 'MSP30', 'MSP50', 'MSP100',
] as const;
export type BillingLevel = (typeof BILLING_LEVELS)[number];
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/lib/constants.test.ts
```

Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/lib/constants.ts tests/lib/constants.test.ts
git commit -m "feat: 상수 및 타입 정의 (역할, 팀, 고객, 계약 단계, 사이드바)"
```

---

## Task 4: DB 스키마 설계 (사용자와 공동 설계)

> **중요**: 이 Task는 사용자와 함께 진행합니다. 아래는 PRD 기반 초안이며, 사용자 확인 후 확정합니다.

**Files:**
- Create: `supabase/migrations/00001_create_enums.sql`
- Create: `supabase/migrations/00002_create_profiles.sql`
- Create: `supabase/migrations/00003_create_teams.sql`
- Create: `supabase/migrations/00004_create_clients.sql`
- Create: `supabase/migrations/00005_create_contacts.sql`
- Create: `supabase/migrations/00006_create_contracts.sql`
- Create: `supabase/migrations/00007_create_contract_details.sql`
- Create: `supabase/migrations/00008_create_contract_teams.sql`
- Create: `supabase/migrations/00009_create_contract_history.sql`
- Create: `supabase/migrations/00010_create_education_ops.sql`
- Create: `supabase/migrations/00011_create_views.sql`
- Create: `supabase/migrations/00012_create_indexes.sql`

- [ ] **Step 1: 사용자에게 스키마 초안 제시 및 리뷰 요청**

아래 ERD를 사용자에게 보여주고 피드백을 받는다:

```
auth.users (Supabase 관리)
  └─ profiles (1:1)
       ├─ id (FK → auth.users.id)
       ├─ name, email, role, team_id, position
       └─ team_id → teams.id

teams
  ├─ id, name, type (msp/education/dev)
  └─ 예시: "MSP팀", "교육팀", "개발팀"

clients
  ├─ id, client_id (표시용: UNIV-001), name
  ├─ client_type (univ/corp/govt/asso/etc)
  ├─ grade (A~E), business_types (text[])
  ├─ parent_id (FK → clients.id, NULL이면 최상위)
  ├─ memo, assigned_to (사내 담당자)
  └─ created/updated/deleted_at

contacts (고객별 연락처, 1:N)
  ├─ client_id → clients.id
  ├─ name, email, phone, department, position
  ├─ role (결제자/기술담당/영업담당 등)
  └─ is_primary, deleted_at

contracts (통합 모델)
  ├─ id, contract_id (표시용: MSP-001, CT2026001)
  ├─ client_id → clients.id
  ├─ type (msp/tt/dev), stage
  ├─ name, description
  ├─ total_amount, currency (KRW/USD)
  ├─ assigned_to, contact_id
  └─ created/updated/deleted_at

contract_msp_details (MSP 확장, 1:1)
  ├─ contract_id → contracts.id
  ├─ billing_level, credit_share
  ├─ expected_mrr, payer, sales_rep
  ├─ aws_amount, has_management_fee
  └─ payment_method

contract_tt_details (교육 확장, 1:1)
  ├─ contract_id → contracts.id
  └─ (교육 계약 전용 필드 — 현재 최소)

contract_teams (매출 배분, 1:N)
  ├─ contract_id → contracts.id
  ├─ team_id → teams.id
  └─ percentage (합계 100%)

contract_history (이력 추적)
  ├─ contract_id → contracts.id
  ├─ from_stage, to_stage
  ├─ changed_by → profiles.id
  └─ note, created_at

education_operations (교육 운영, 계약 1:N)
  ├─ contract_id → contracts.id
  ├─ operation_name, location, target_org
  ├─ start_date, end_date, total_hours
  ├─ contracted_count, recruited_count, actual_count
  ├─ provides_lunch, provides_snack
  ├─ main_instructor, sub_instructor_1, sub_instructor_2
  └─ deleted_at

client_msp_details (MSP 고객 확장, 1:1)
  ├─ client_id → clients.id
  ├─ industry, company_size
  ├─ tags (text[]), memo
  └─ aws_account_ids (text[])

user_preferences (사용자 환경설정)
  ├─ user_id → profiles.id
  └─ preferences (jsonb): 컬럼 설정, 순서 등
```

- [ ] **Step 2: 사용자 피드백 반영하여 마이그레이션 파일 확정**

(사용자와 논의 후 진행)

- [ ] **Step 3: ENUM 타입 생성**

`supabase/migrations/00001_create_enums.sql`:

```sql
-- 사용자 역할
CREATE TYPE user_role AS ENUM ('staff', 'team_lead', 'admin', 'c_level');

-- 팀 타입
CREATE TYPE team_type AS ENUM ('msp', 'education', 'dev');

-- 고객 유형
CREATE TYPE client_type AS ENUM ('univ', 'corp', 'govt', 'asso', 'etc');

-- 고객 등급
CREATE TYPE client_grade AS ENUM ('A', 'B', 'C', 'D', 'E');

-- 비즈니스 타입
CREATE TYPE business_type AS ENUM ('msp', 'tt', 'dev');

-- 계약 타입
CREATE TYPE contract_type AS ENUM ('msp', 'tt', 'dev');

-- MSP 계약 단계
CREATE TYPE msp_stage AS ENUM ('pre_contract', 'contracted', 'completed', 'settled');

-- 교육 계약 단계
CREATE TYPE edu_stage AS ENUM ('proposal', 'contracted', 'operating', 'op_completed', 'settled');

-- 통화
CREATE TYPE currency_type AS ENUM ('KRW', 'USD');
```

- [ ] **Step 4: profiles 테이블 생성**

`supabase/migrations/00002_create_profiles.sql`:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'staff',
  team_id UUID,
  position TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 새 사용자 가입 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

- [ ] **Step 5: teams 테이블 생성**

`supabase/migrations/00003_create_teams.sql`:

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type team_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- profiles.team_id FK 추가
ALTER TABLE profiles
  ADD CONSTRAINT profiles_team_id_fk
  FOREIGN KEY (team_id) REFERENCES teams(id);

-- 초기 팀 데이터
INSERT INTO teams (name, type) VALUES
  ('MSP팀', 'msp'),
  ('교육팀', 'education'),
  ('개발팀', 'dev');
```

- [ ] **Step 6: clients 테이블 생성**

`supabase/migrations/00004_create_clients.sql`:

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL UNIQUE,  -- 표시용 ID (UNIV-001 등)
  name TEXT NOT NULL,
  client_type client_type NOT NULL,
  grade client_grade,
  business_types business_type[] DEFAULT '{}',
  parent_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id),
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- 계층 2단계 제한 체크
CREATE OR REPLACE FUNCTION check_client_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    -- 부모가 이미 자식인지 확인
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

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
```

- [ ] **Step 7: contacts 테이블 생성**

`supabase/migrations/00005_create_contacts.sql`:

```sql
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  department TEXT,
  position TEXT,
  role TEXT,  -- 결제자, 기술담당, 영업담당 등 (자유 입력)
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 8: contracts 통합 테이블 생성**

`supabase/migrations/00006_create_contracts.sql`:

```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id TEXT NOT NULL UNIQUE,  -- 표시용 ID (MSP-001, CT2026001)
  client_id UUID NOT NULL REFERENCES clients(id),
  type contract_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  total_amount BIGINT DEFAULT 0,  -- 원 단위
  currency currency_type DEFAULT 'KRW',
  stage TEXT,  -- msp_stage 또는 edu_stage (type에 따라 다름)
  assigned_to UUID REFERENCES profiles(id),
  contact_id UUID REFERENCES contacts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- MSP 계약 ID 생성: MSP-001
CREATE OR REPLACE FUNCTION generate_msp_contract_id()
RETURNS TEXT AS $$
DECLARE seq INT;
BEGIN
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_id FROM 5) AS INT)
  ), 0) + 1
  INTO seq
  FROM contracts
  WHERE contract_id LIKE 'MSP-%';
  
  RETURN 'MSP-' || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- 교육 계약 ID 생성: CT2026001
CREATE OR REPLACE FUNCTION generate_edu_contract_id()
RETURNS TEXT AS $$
DECLARE
  yr TEXT;
  seq INT;
BEGIN
  yr := EXTRACT(YEAR FROM now())::TEXT;
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_id FROM 7) AS INT)
  ), 0) + 1
  INTO seq
  FROM contracts
  WHERE contract_id LIKE 'CT' || yr || '%';
  
  RETURN 'CT' || yr || LPAD(seq::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
```

- [ ] **Step 9: 확장 테이블 생성**

`supabase/migrations/00007_create_contract_details.sql`:

```sql
-- MSP 계약 확장
CREATE TABLE contract_msp_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
  billing_level TEXT,
  credit_share NUMERIC(5,2),
  expected_mrr BIGINT,
  payer TEXT,
  sales_rep TEXT,
  aws_amount BIGINT,
  has_management_fee BOOLEAN DEFAULT FALSE,
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER contract_msp_details_updated_at
  BEFORE UPDATE ON contract_msp_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 교육 계약 확장
CREATE TABLE contract_tt_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL UNIQUE REFERENCES contracts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER contract_tt_details_updated_at
  BEFORE UPDATE ON contract_tt_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 10: 매출 배분 + 이력 테이블 생성**

`supabase/migrations/00008_create_contract_teams.sql`:

```sql
CREATE TABLE contract_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id),
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (contract_id, team_id)
);

CREATE TRIGGER contract_teams_updated_at
  BEFORE UPDATE ON contract_teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

`supabase/migrations/00009_create_contract_history.sql`:

```sql
CREATE TABLE contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES profiles(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- [ ] **Step 11: 교육 운영 테이블 생성**

`supabase/migrations/00010_create_education_ops.sql`:

```sql
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
  main_instructor UUID REFERENCES profiles(id),
  sub_instructor_1 UUID REFERENCES profiles(id),
  sub_instructor_2 UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TRIGGER education_operations_updated_at
  BEFORE UPDATE ON education_operations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 12: MSP 고객 확장 + 사용자 환경설정 테이블 생성**

`supabase/migrations/00011_create_client_msp_details.sql`:

```sql
CREATE TABLE client_msp_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
  industry TEXT,
  company_size TEXT,
  tags TEXT[] DEFAULT '{}',
  memo TEXT,
  aws_account_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER client_msp_details_updated_at
  BEFORE UPDATE ON client_msp_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

- [ ] **Step 13: VIEW + 인덱스 생성**

`supabase/migrations/00012_create_views.sql`:

```sql
-- 계약 + 확장 정보 통합 뷰
CREATE OR REPLACE VIEW contracts_with_details AS
SELECT
  c.*,
  msp.billing_level,
  msp.credit_share,
  msp.expected_mrr,
  msp.payer,
  msp.sales_rep,
  msp.aws_amount,
  msp.has_management_fee,
  cl.name AS client_name,
  cl.client_id AS client_display_id,
  p.name AS assigned_to_name
FROM contracts c
LEFT JOIN contract_msp_details msp ON msp.contract_id = c.id
LEFT JOIN clients cl ON cl.id = c.client_id
LEFT JOIN profiles p ON p.id = c.assigned_to
WHERE c.deleted_at IS NULL;
```

`supabase/migrations/00013_create_indexes.sql`:

```sql
-- 소프트 삭제 필터용 부분 인덱스
CREATE INDEX idx_clients_active ON clients (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_active ON contracts (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_active ON contacts (id) WHERE deleted_at IS NULL;

-- 외래키 인덱스
CREATE INDEX idx_clients_parent ON clients (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_contacts_client ON contacts (client_id);
CREATE INDEX idx_contracts_client ON contracts (client_id);
CREATE INDEX idx_contracts_type ON contracts (type);
CREATE INDEX idx_contracts_stage ON contracts (stage);
CREATE INDEX idx_contract_teams_contract ON contract_teams (contract_id);
CREATE INDEX idx_contract_teams_team ON contract_teams (team_id);
CREATE INDEX idx_contract_history_contract ON contract_history (contract_id);
CREATE INDEX idx_education_ops_contract ON education_operations (contract_id);

-- FTS + pg_trgm 인덱스 (글로벌 검색용)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_clients_name_trgm ON clients USING gin (name gin_trgm_ops);
CREATE INDEX idx_contacts_name_trgm ON contacts USING gin (name gin_trgm_ops);
CREATE INDEX idx_contracts_name_trgm ON contracts USING gin (name gin_trgm_ops);
```

- [ ] **Step 14: 사용자 확인 후 커밋**

```bash
git add supabase/
git commit -m "feat: DB 스키마 마이그레이션 (통합 모델 + 확장 테이블 + 인덱스)"
```

---

## Task 5: RLS 정책 구현 (Tiger T-1)

> **Pre-mortem T-1 대응**: RLS 팀 격리를 `security_definer` 함수로 캡슐화하여 성능 확보. 정책별 테스트 필수.

**Files:**
- Create: `supabase/migrations/00014_create_rls_functions.sql`
- Create: `supabase/migrations/00015_create_rls_policies.sql`
- Test: `tests/rls/` (Supabase 로컬 환경에서 테스트)

- [ ] **Step 1: RLS 헬퍼 함수 작성**

`supabase/migrations/00014_create_rls_functions.sql`:

```sql
-- 현재 사용자의 역할 가져오기
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 사용자의 팀 ID 가져오기
CREATE OR REPLACE FUNCTION auth.user_team_id()
RETURNS UUID AS $$
  SELECT team_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 현재 사용자가 admin 또는 c_level인지
CREATE OR REPLACE FUNCTION auth.is_admin_or_clevel()
RETURNS BOOLEAN AS $$
  SELECT auth.user_role() IN ('admin', 'c_level');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 특정 계약이 현재 사용자의 팀에 배분되어 있는지
CREATE OR REPLACE FUNCTION auth.can_access_contract(p_contract_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- admin/c_level은 모든 계약 접근 가능
  IF auth.is_admin_or_clevel() THEN
    RETURN TRUE;
  END IF;
  
  -- team_lead/staff는 소속 팀 배분 계약만
  RETURN EXISTS (
    SELECT 1 FROM contract_teams
    WHERE contract_id = p_contract_id
      AND team_id = auth.user_team_id()
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 특정 고객이 현재 사용자의 팀 계약과 관련 있는지
CREATE OR REPLACE FUNCTION auth.can_access_client(p_client_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF auth.is_admin_or_clevel() THEN
    RETURN TRUE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM contracts c
    JOIN contract_teams ct ON ct.contract_id = c.id
    WHERE c.client_id = p_client_id
      AND ct.team_id = auth.user_team_id()
      AND c.deleted_at IS NULL
      AND ct.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

- [ ] **Step 2: RLS 정책 적용**

`supabase/migrations/00015_create_rls_policies.sql`:

```sql
-- 모든 테이블에 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_msp_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_tt_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_msp_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- profiles: 본인만 수정, 전체 조회 가능
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- teams: 전체 조회 가능 (읽기 전용)
CREATE POLICY "teams_select" ON teams FOR SELECT USING (true);

-- clients: 역할별 접근
CREATE POLICY "clients_select" ON clients FOR SELECT
  USING (auth.can_access_client(id));
CREATE POLICY "clients_insert" ON clients FOR INSERT
  WITH CHECK (auth.is_admin_or_clevel() OR auth.user_role() IN ('staff', 'team_lead'));
CREATE POLICY "clients_update" ON clients FOR UPDATE
  USING (auth.can_access_client(id));
CREATE POLICY "clients_delete" ON clients FOR DELETE
  USING (auth.can_access_client(id));

-- contacts: 고객 접근 권한과 동일
CREATE POLICY "contacts_select" ON contacts FOR SELECT
  USING (auth.can_access_client(client_id));
CREATE POLICY "contacts_insert" ON contacts FOR INSERT
  WITH CHECK (auth.can_access_client(client_id));
CREATE POLICY "contacts_update" ON contacts FOR UPDATE
  USING (auth.can_access_client(client_id));
CREATE POLICY "contacts_delete" ON contacts FOR DELETE
  USING (auth.can_access_client(client_id));

-- contracts: 팀 배분 기반
CREATE POLICY "contracts_select" ON contracts FOR SELECT
  USING (auth.can_access_contract(id));
CREATE POLICY "contracts_insert" ON contracts FOR INSERT
  WITH CHECK (true);  -- 등록 후 팀 배분으로 접근 제어
CREATE POLICY "contracts_update" ON contracts FOR UPDATE
  USING (auth.can_access_contract(id));
CREATE POLICY "contracts_delete" ON contracts FOR DELETE
  USING (auth.can_access_contract(id));

-- contract_msp_details: 계약 접근 권한과 동일
CREATE POLICY "msp_details_select" ON contract_msp_details FOR SELECT
  USING (auth.can_access_contract(contract_id));
CREATE POLICY "msp_details_insert" ON contract_msp_details FOR INSERT
  WITH CHECK (auth.can_access_contract(contract_id));
CREATE POLICY "msp_details_update" ON contract_msp_details FOR UPDATE
  USING (auth.can_access_contract(contract_id));

-- contract_tt_details: 계약 접근 권한과 동일
CREATE POLICY "tt_details_select" ON contract_tt_details FOR SELECT
  USING (auth.can_access_contract(contract_id));
CREATE POLICY "tt_details_insert" ON contract_tt_details FOR INSERT
  WITH CHECK (auth.can_access_contract(contract_id));
CREATE POLICY "tt_details_update" ON contract_tt_details FOR UPDATE
  USING (auth.can_access_contract(contract_id));

-- contract_teams: 계약 접근 권한과 동일
CREATE POLICY "contract_teams_select" ON contract_teams FOR SELECT
  USING (auth.can_access_contract(contract_id));
CREATE POLICY "contract_teams_insert" ON contract_teams FOR INSERT
  WITH CHECK (auth.can_access_contract(contract_id));
CREATE POLICY "contract_teams_update" ON contract_teams FOR UPDATE
  USING (auth.can_access_contract(contract_id));

-- contract_history: 계약 접근 권한과 동일 (읽기+쓰기)
CREATE POLICY "history_select" ON contract_history FOR SELECT
  USING (auth.can_access_contract(contract_id));
CREATE POLICY "history_insert" ON contract_history FOR INSERT
  WITH CHECK (auth.can_access_contract(contract_id));

-- education_operations: 계약 접근 권한과 동일
CREATE POLICY "edu_ops_select" ON education_operations FOR SELECT
  USING (auth.can_access_contract(contract_id));
CREATE POLICY "edu_ops_insert" ON education_operations FOR INSERT
  WITH CHECK (auth.can_access_contract(contract_id));
CREATE POLICY "edu_ops_update" ON education_operations FOR UPDATE
  USING (auth.can_access_contract(contract_id));
CREATE POLICY "edu_ops_delete" ON education_operations FOR DELETE
  USING (auth.can_access_contract(contract_id));

-- client_msp_details: 고객 접근 권한과 동일
CREATE POLICY "client_msp_select" ON client_msp_details FOR SELECT
  USING (auth.can_access_client(client_id));
CREATE POLICY "client_msp_insert" ON client_msp_details FOR INSERT
  WITH CHECK (auth.can_access_client(client_id));
CREATE POLICY "client_msp_update" ON client_msp_details FOR UPDATE
  USING (auth.can_access_client(client_id));

-- user_preferences: 본인만
CREATE POLICY "prefs_select" ON user_preferences FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "prefs_insert" ON user_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "prefs_update" ON user_preferences FOR UPDATE
  USING (user_id = auth.uid());
```

- [ ] **Step 3: Supabase 로컬에서 RLS 테스트**

```bash
npx supabase start
npx supabase db reset
```

Supabase Studio (localhost:54323)에서 SQL 에디터로 다음 시나리오 검증:
1. staff(MSP팀) 로그인 → MSP 팀 계약만 조회되는지
2. admin 로그인 → 전체 계약 조회되는지
3. staff가 다른 팀 계약 UPDATE 시도 → 차단되는지

- [ ] **Step 4: 커밋**

```bash
git add supabase/migrations/00014_create_rls_functions.sql supabase/migrations/00015_create_rls_policies.sql
git commit -m "feat: RLS 팀 격리 정책 구현 (security_definer 함수 기반)"
```

---

## Task 6: Supabase 클라이언트 + 세션 미들웨어

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: 브라우저 Supabase 클라이언트**

`src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: 서버 Supabase 클라이언트 (API Routes용)**

`src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
}
```

- [ ] **Step 3: 세션 갱신 미들웨어**

`src/lib/supabase/middleware.ts`:

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 미인증 사용자 → 로그인으로 리다이렉트
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 인증된 사용자가 /login 접근 → 대시보드로
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

`src/middleware.ts`:

```typescript
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

- [ ] **Step 4: 커밋**

```bash
git add src/lib/supabase/ src/middleware.ts
git commit -m "feat: supabase 클라이언트 + 세션 갱신 미들웨어"
```

---

## Task 7: 인증 Provider + 훅

**Files:**
- Create: `src/providers/auth-provider.tsx`
- Create: `src/hooks/use-auth.ts`
- Create: `src/hooks/use-current-user.ts`
- Create: `src/lib/auth/permissions.ts`
- Create: `src/lib/auth/check-access.ts`
- Test: `tests/lib/permissions.test.ts`

- [ ] **Step 1: 권한 매트릭스 테스트 작성**

`tests/lib/permissions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { canAccessSection, canAccessFeature } from '@/lib/auth/permissions';
import type { UserRole, TeamType } from '@/lib/constants';

describe('canAccessSection', () => {
  it('admin은 모든 섹션에 접근 가능', () => {
    expect(canAccessSection('nxt', 'admin', 'msp')).toBe(true);
    expect(canAccessSection('msp', 'admin', 'msp')).toBe(true);
    expect(canAccessSection('edu', 'admin', 'msp')).toBe(true);
    expect(canAccessSection('dev', 'admin', 'msp')).toBe(true);
  });

  it('c_level은 모든 섹션에 접근 가능', () => {
    expect(canAccessSection('nxt', 'c_level', 'education')).toBe(true);
    expect(canAccessSection('msp', 'c_level', 'education')).toBe(true);
  });

  it('staff(MSP팀)은 MSP 섹션만 접근 가능', () => {
    expect(canAccessSection('nxt', 'staff', 'msp')).toBe(false);
    expect(canAccessSection('msp', 'staff', 'msp')).toBe(true);
    expect(canAccessSection('edu', 'staff', 'msp')).toBe(false);
    expect(canAccessSection('dev', 'staff', 'msp')).toBe(false);
  });

  it('team_lead(교육팀)은 EDU 섹션만 접근 가능', () => {
    expect(canAccessSection('nxt', 'team_lead', 'education')).toBe(false);
    expect(canAccessSection('edu', 'team_lead', 'education')).toBe(true);
    expect(canAccessSection('msp', 'team_lead', 'education')).toBe(false);
  });
});

describe('canAccessFeature', () => {
  it('staff는 매출 분석에 접근 불가', () => {
    expect(canAccessFeature('revenue_all', 'staff')).toBe(false);
    expect(canAccessFeature('revenue_team', 'staff')).toBe(false);
  });

  it('team_lead는 팀 매출만 접근 가능', () => {
    expect(canAccessFeature('revenue_all', 'team_lead')).toBe(false);
    expect(canAccessFeature('revenue_team', 'team_lead')).toBe(true);
  });

  it('c_level은 전사 매출 접근 가능', () => {
    expect(canAccessFeature('revenue_all', 'c_level')).toBe(true);
    expect(canAccessFeature('revenue_team', 'c_level')).toBe(true);
  });

  it('admin만 사용자 관리 접근 가능', () => {
    expect(canAccessFeature('user_management', 'admin')).toBe(true);
    expect(canAccessFeature('user_management', 'c_level')).toBe(false);
    expect(canAccessFeature('user_management', 'staff')).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/lib/permissions.test.ts
```

Expected: FAIL

- [ ] **Step 3: 권한 매트릭스 구현**

`src/lib/auth/permissions.ts`:

```typescript
import type { UserRole, TeamType } from '@/lib/constants';
import { SIDEBAR_SECTIONS } from '@/lib/constants';

type SectionKey = 'nxt' | 'msp' | 'edu' | 'dev';

const SECTION_TEAM_MAP: Record<string, TeamType> = {
  msp: 'msp',
  edu: 'education',
  dev: 'dev',
};

export function canAccessSection(
  section: SectionKey,
  role: UserRole,
  teamType: TeamType,
): boolean {
  // admin, c_level은 모든 섹션 접근 가능
  if (role === 'admin' || role === 'c_level') return true;

  // NXT 섹션은 admin/c_level 전용
  if (section === 'nxt') return false;

  // staff, team_lead는 소속 팀 섹션만
  const requiredTeam = SECTION_TEAM_MAP[section];
  return requiredTeam === teamType;
}

type Feature =
  | 'revenue_all'
  | 'revenue_team'
  | 'user_management'
  | 'nxt_dashboard';

const FEATURE_ACCESS: Record<Feature, UserRole[]> = {
  revenue_all: ['admin', 'c_level'],
  revenue_team: ['team_lead', 'admin', 'c_level'],
  user_management: ['admin'],
  nxt_dashboard: ['admin', 'c_level'],
};

export function canAccessFeature(feature: Feature, role: UserRole): boolean {
  return FEATURE_ACCESS[feature]?.includes(role) ?? false;
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/lib/permissions.test.ts
```

Expected: PASS

- [ ] **Step 5: Auth Provider 구현**

`src/providers/auth-provider.tsx`:

```typescript
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

interface AuthContext {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContext | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthContext must be used within AuthProvider');
  return context;
}
```

- [ ] **Step 6: 현재 사용자 훅 구현**

`src/hooks/use-current-user.ts`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthContext } from '@/providers/auth-provider';
import type { UserRole, TeamType } from '@/lib/constants';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  teamType: TeamType | null;
  position: string | null;
}

export function useCurrentUser() {
  const { user } = useAuthContext();
  const supabase = createClient();

  return useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async (): Promise<CurrentUser> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, teams(type)')
        .eq('id', user!.id)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
        teamId: data.team_id,
        teamType: (data.teams as { type: TeamType } | null)?.type ?? null,
        position: data.position,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
  });
}
```

- [ ] **Step 7: 커밋**

```bash
git add src/lib/auth/ src/providers/auth-provider.tsx src/hooks/ tests/lib/permissions.test.ts
git commit -m "feat: RBAC 권한 매트릭스 + 인증 provider + 사용자 훅"
```

---

## Task 8: API 기반 — 에러 핸들러 + 응답 포맷 + Zod 검증

**Files:**
- Create: `src/lib/api/error-handler.ts`
- Create: `src/lib/api/response.ts`
- Create: `src/lib/validators/auth.ts`
- Create: `src/lib/validators/common.ts`
- Test: `tests/lib/validators.test.ts`

- [ ] **Step 1: Zod 스키마 테스트 작성**

`tests/lib/validators.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { loginSchema, paginationSchema } from '@/lib/validators/common';

describe('loginSchema', () => {
  it('유효한 이메일/비밀번호를 통과시킨다', () => {
    const result = loginSchema.safeParse({
      email: 'test@nxtcloud.kr',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('빈 이메일을 거부한다', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 이메일 형식을 거부한다', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('6자 미만 비밀번호를 거부한다', () => {
    const result = loginSchema.safeParse({
      email: 'test@nxtcloud.kr',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('기본값을 적용한다', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('pageSize 100 초과를 거부한다', () => {
    const result = paginationSchema.safeParse({ pageSize: 200 });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/lib/validators.test.ts
```

Expected: FAIL

- [ ] **Step 3: Zod 스키마 구현**

`src/lib/validators/common.ts`:

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식이 아닙니다'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const uuidSchema = z.string().uuid('올바른 ID 형식이 아닙니다');

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(6, '현재 비밀번호를 입력해주세요'),
    newPassword: z.string().min(6, '새 비밀번호는 6자 이상이어야 합니다'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '새 비밀번호가 일치하지 않습니다',
    path: ['confirmPassword'],
  });
```

- [ ] **Step 4: API 에러 핸들러 + 응답 포맷 구현**

`src/lib/api/response.ts`:

```typescript
import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function success<T>(data: T, meta?: ApiResponse['meta']) {
  return NextResponse.json<ApiResponse<T>>({ data, error: null, meta });
}

export function error(message: string, status: number = 400) {
  return NextResponse.json<ApiResponse>({ data: null, error: message }, { status });
}
```

`src/lib/api/error-handler.ts`:

```typescript
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { error as errorResponse } from './response';

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    const message = err.errors.map((e) => e.message).join(', ');
    return errorResponse(message, 400);
  }

  if (err instanceof Error) {
    // Supabase 에러
    if ('code' in err) {
      const code = (err as { code: string }).code;
      if (code === 'PGRST116') return errorResponse('요청하신 항목을 찾을 수 없습니다', 404);
      if (code === '42501') return errorResponse('접근 권한이 없습니다', 403);
      if (code === '23505') return errorResponse('중복된 데이터가 존재합니다', 409);
    }
    return errorResponse(err.message, 500);
  }

  return errorResponse('알 수 없는 오류가 발생했습니다', 500);
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/lib/validators.test.ts
```

Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/lib/api/ src/lib/validators/ tests/lib/validators.test.ts
git commit -m "feat: API 에러 핸들러 + 표준 응답 포맷 + zod 검증 스키마"
```

---

## Task 9: Providers 셋업 + Root Layout

**Files:**
- Create: `src/providers/query-provider.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Query Provider**

`src/providers/query-provider.tsx`:

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30초
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

- [ ] **Step 2: Root Layout**

`src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NXT CRM',
  description: 'NXT Cloud CRM v2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 루트 페이지 (리다이렉트)**

`src/app/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

- [ ] **Step 4: 커밋**

```bash
git add src/providers/ src/app/layout.tsx src/app/page.tsx
git commit -m "feat: providers 셋업 (react query, auth) + root layout"
```

---

## Task 10: 로그인 페이지

> **UI 참조**: ui_design.pen의 로그인 화면 (Pencil MCP로 확인)
> 헥사곤+N 로고 + NXT CRM 타이틀 + 이메일/비밀번호 폼

**Files:**
- Create: `src/components/auth/login-form.tsx`
- Create: `src/app/login/page.tsx`
- Test: `tests/components/login-form.test.tsx`

- [ ] **Step 1: 로그인 폼 테스트 작성**

`tests/components/login-form.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/auth/login-form';

// AuthProvider mock
vi.mock('@/providers/auth-provider', () => ({
  useAuthContext: () => ({
    signIn: vi.fn().mockResolvedValue({ error: null }),
    loading: false,
  }),
}));

describe('LoginForm', () => {
  it('이메일, 비밀번호 입력 필드와 로그인 버튼이 렌더링된다', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('이메일')).toBeInTheDocument();
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });

  it('빈 이메일로 제출하면 에러 메시지를 표시한다', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('이메일을 입력해주세요')).toBeInTheDocument();
  });

  it('잘못된 이메일 형식으로 제출하면 에러 메시지를 표시한다', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('이메일'), 'invalid');
    await user.type(screen.getByLabelText('비밀번호'), 'password123');
    await user.click(screen.getByRole('button', { name: '로그인' }));
    expect(await screen.findByText('올바른 이메일 형식이 아닙니다')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/components/login-form.test.tsx
```

Expected: FAIL

- [ ] **Step 3: 로그인 폼 컴포넌트 구현**

`src/components/auth/login-form.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';
import { loginSchema, type LoginInput } from '@/lib/validators/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthContext();
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput | 'root', string>>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    const result = loginSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof LoginInput;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(result.data.email, result.data.password);
    setLoading(false);

    if (error) {
      setErrors({ root: '이메일 또는 비밀번호가 올바르지 않습니다' });
      return;
    }

    const redirect = searchParams.get('redirect') ?? '/dashboard';
    router.push(redirect);
  }

  return (
    <Card className="w-full max-w-sm border-border">
      <CardHeader className="text-center">
        {/* 로고: 헥사곤 + N */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border-2 border-accent">
          <span className="text-xl font-bold text-accent">N</span>
        </div>
        <CardTitle className="text-2xl font-bold text-text-primary">NXT CRM</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.root && (
            <p className="text-sm text-error">{errors.root}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="이메일을 입력하세요"
              autoComplete="email"
              autoFocus
            />
            {errors.email && (
              <p className="text-sm text-error">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-sm text-error">{errors.password}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: 로그인 페이지**

`src/app/login/page.tsx`:

```typescript
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-page">
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/components/login-form.test.tsx
```

Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/auth/ src/app/login/ tests/components/login-form.test.tsx
git commit -m "feat: 로그인 페이지 + 폼 컴포넌트 (zod 검증)"
```

---

## Task 11: 사이드바 레이아웃

> **UI 참조**: ui_design.pen 사이드바 컴포넌트 (node ID: U0fjq) — Pencil MCP로 확인
> 섹션: NXT / MSP / EDU / DEV, 글로벌 검색바, 프로필 영역

**Files:**
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/sidebar-section.tsx`
- Create: `src/components/layout/sidebar-nav-item.tsx`
- Create: `src/components/layout/app-layout.tsx`
- Create: `src/components/layout/page-header.tsx`

- [ ] **Step 1: 사이드바 네비게이션 아이템**

`src/components/layout/sidebar-nav-item.tsx`:

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

interface SidebarNavItemProps {
  href: string;
  label: string;
  icon: string;
}

export function SidebarNavItem({ href, label, icon }: SidebarNavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[
    toPascalCase(icon)
  ];

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-accent/10 font-medium text-accent'
          : 'text-text-secondary hover:bg-accent/5 hover:text-text-primary',
      )}
    >
      {IconComponent && <IconComponent className="h-4 w-4" />}
      <span>{label}</span>
    </Link>
  );
}

function toPascalCase(str: string): string {
  return str
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
```

- [ ] **Step 2: 사이드바 섹션**

`src/components/layout/sidebar-section.tsx`:

```typescript
import { Separator } from '@/components/ui/separator';
import { SidebarNavItem } from './sidebar-nav-item';

interface SidebarSectionProps {
  label: string;
  items: ReadonlyArray<{ href: string; label: string; icon: string }>;
}

export function SidebarSection({ label, items }: SidebarSectionProps) {
  return (
    <div className="space-y-1">
      <Separator className="my-2" />
      <p className="px-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      {items.map((item) => (
        <SidebarNavItem key={item.href} {...item} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 사이드바 메인**

`src/components/layout/sidebar.tsx`:

```typescript
'use client';

import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuthContext } from '@/providers/auth-provider';
import { canAccessSection } from '@/lib/auth/permissions';
import { SIDEBAR_SECTIONS } from '@/lib/constants';
import { SidebarSection } from './sidebar-section';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, Search, LogOut } from 'lucide-react';
import Link from 'next/link';

export function Sidebar() {
  const { data: currentUser } = useCurrentUser();
  const { signOut } = useAuthContext();

  if (!currentUser) return null;

  const visibleSections = SIDEBAR_SECTIONS.filter((section) =>
    canAccessSection(
      section.key as 'nxt' | 'msp' | 'edu' | 'dev',
      currentUser.role,
      currentUser.teamType ?? 'msp',
    ),
  );

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-bg-sidebar">
      {/* 로고 */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded border-2 border-accent">
          <span className="text-sm font-bold text-accent">N</span>
        </div>
        <span className="text-lg font-bold text-text-primary">NXT CRM</span>
      </div>

      {/* 글로벌 검색 */}
      <div className="px-3 pb-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-text-muted"
          onClick={() => {
            // TODO: Cmd+K 검색 모달 (Plan 2에서 구현)
          }}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">검색...</span>
          <kbd className="ml-auto rounded bg-bg-page px-1.5 py-0.5 text-xs text-text-muted">
            ⌘K
          </kbd>
        </Button>
      </div>

      {/* 네비게이션 섹션 */}
      <nav className="flex-1 overflow-y-auto px-2">
        {visibleSections.map((section) => (
          <SidebarSection
            key={section.key}
            label={section.label}
            items={section.items}
          />
        ))}
      </nav>

      {/* 사용자 프로필 */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent/10 text-accent text-xs">
              {currentUser.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {currentUser.name}
            </p>
            <p className="truncate text-xs text-text-muted">
              {currentUser.position ?? currentUser.role}
            </p>
          </div>
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4 text-text-muted" />
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: App Layout (사이드바 + 메인)**

`src/components/layout/app-layout.tsx`:

```typescript
'use client';

import { Sidebar } from './sidebar';
import { useAuthContext } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-page">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 5: 페이지 헤더**

`src/components/layout/page-header.tsx`:

```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/layout/
git commit -m "feat: 사이드바 레이아웃 (RBAC 섹션 필터링 + 검색 + 프로필)"
```

---

## Task 12: 공통 컴포넌트 (테이블, 빈 상태, 에러, 확인 대화상자)

**Files:**
- Create: `src/components/common/data-table.tsx`
- Create: `src/components/common/empty-state.tsx`
- Create: `src/components/common/error-state.tsx`
- Create: `src/components/common/skeleton-card.tsx`
- Create: `src/components/common/confirm-dialog.tsx`

- [ ] **Step 1: 빈 상태 컴포넌트**

`src/components/common/empty-state.tsx`:

```typescript
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-text-secondary">{message}</p>
      {actionLabel && onAction && (
        <Button variant="link" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 에러 상태 컴포넌트**

`src/components/common/error-state.tsx`:

```typescript
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = '데이터를 불러올 수 없습니다.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-error">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-3">
          다시 시도
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 스켈레톤 카드**

`src/components/common/skeleton-card.tsx`:

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SkeletonCard() {
  return (
    <Card className="border-border">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: 확인 대화상자**

`src/components/common/confirm-dialog.tsx`:

```typescript
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'default',
  onConfirm,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'destructive' ? 'destructive' : 'default'} onClick={onConfirm} disabled={loading}>
            {loading ? '처리 중...' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: DataTable (기본 테이블 with 페이지네이션)**

`src/components/common/data-table.tsx`:

```typescript
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  page = 1,
  totalPages = 1,
  onPageChange,
  onRowClick,
  emptyMessage = '데이터가 없습니다',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} style={{ width: col.width }}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-text-muted">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => (
                <TableRow
                  key={idx}
                  className={onRowClick ? 'cursor-pointer hover:bg-accent/5' : ''}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-text-secondary">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/common/
git commit -m "feat: 공통 컴포넌트 (DataTable, EmptyState, ErrorState, ConfirmDialog)"
```

---

## Task 13: Auth Guard + Role Guard

**Files:**
- Create: `src/components/auth/auth-guard.tsx`
- Create: `src/components/auth/role-guard.tsx`
- Test: `tests/components/auth-guard.test.tsx`

- [ ] **Step 1: 테스트 작성**

`tests/components/auth-guard.test.tsx`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthGuard } from '@/components/auth/auth-guard';

const mockUseAuthContext = vi.fn();
vi.mock('@/providers/auth-provider', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

const mockRouter = { push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/dashboard',
}));

describe('AuthGuard', () => {
  it('로딩 중일 때 스켈레톤을 표시한다', () => {
    mockUseAuthContext.mockReturnValue({ user: null, loading: true });
    render(<AuthGuard><div>content</div></AuthGuard>);
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('인증된 사용자에게 children을 렌더링한다', () => {
    mockUseAuthContext.mockReturnValue({ user: { id: '1' }, loading: false });
    render(<AuthGuard><div>content</div></AuthGuard>);
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('미인증 사용자를 로그인으로 리다이렉트한다', () => {
    mockUseAuthContext.mockReturnValue({ user: null, loading: false });
    render(<AuthGuard><div>content</div></AuthGuard>);
    expect(mockRouter.push).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/components/auth-guard.test.tsx
```

Expected: FAIL

- [ ] **Step 3: AuthGuard 구현**

`src/components/auth/auth-guard.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
```

- [ ] **Step 4: RoleGuard 구현**

`src/components/auth/role-guard.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { UserRole } from '@/lib/constants';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { data: currentUser, isLoading } = useCurrentUser();
  const router = useRouter();

  if (isLoading) return null;

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    if (fallback) return <>{fallback}</>;
    router.push('/dashboard');
    return null;
  }

  return <>{children}</>;
}
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/components/auth-guard.test.tsx
```

Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add src/components/auth/ tests/components/auth-guard.test.tsx
git commit -m "feat: AuthGuard + RoleGuard 컴포넌트 (인증/권한 보호)"
```

---

## Task 14: 대시보드 + 프로필 페이지 (스캐폴드)

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/profile/page.tsx`
- Create: `src/app/(authenticated)/layout.tsx`

- [ ] **Step 1: 인증된 레이아웃 래퍼**

`src/app/(authenticated)/layout.tsx`:

```typescript
import { AuthGuard } from '@/components/auth/auth-guard';
import { AppLayout } from '@/components/layout/app-layout';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppLayout>{children}</AppLayout>
    </AuthGuard>
  );
}
```

> 주의: dashboard, profile 등의 page.tsx를 `(authenticated)` 그룹 하위로 이동

- [ ] **Step 2: 대시보드 스캐폴드**

`src/app/(authenticated)/dashboard/page.tsx`:

```typescript
import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="대시보드" />
      <div className="grid grid-cols-4 gap-4">
        {/* KPI 카드 4개 — Plan 2에서 구현 */}
        <p className="col-span-4 text-sm text-text-muted">
          대시보드 위젯은 Plan 2에서 구현됩니다.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 프로필 페이지 스캐폴드**

`src/app/(authenticated)/profile/page.tsx`:

```typescript
'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const { data: user } = useCurrentUser();

  if (!user) return null;

  return (
    <div>
      <PageHeader title="프로필" />
      <div className="max-w-2xl space-y-6">
        {/* 기본 정보 (읽기 전용) */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-text-muted">이름</p>
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">이메일</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">직책</p>
              <p className="text-sm font-medium">{user.position ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-text-muted">소속</p>
              <p className="text-sm font-medium">{user.teamType ?? '-'}</p>
            </div>
          </CardContent>
        </Card>

        {/* 비밀번호 변경 — Plan 2에서 구현 */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-lg">비밀번호 변경</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-muted">비밀번호 변경 폼은 Plan 2에서 구현됩니다.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 루트 페이지 리다이렉트 수정**

`src/app/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/
git commit -m "feat: 인증 레이아웃 + 대시보드/프로필 스캐폴드"
```

---

## Task 15: 더미 시드 데이터

**Files:**
- Create: `supabase/seed/dev-seed.sql`

- [ ] **Step 1: 개발용 더미 데이터 작성**

`supabase/seed/dev-seed.sql`:

```sql
-- 테스트 사용자 (Supabase Auth에서 직접 생성 후 profiles에 역할/팀 설정)
-- 이 스크립트는 Supabase Auth 사용자가 이미 생성된 후 실행

-- 팀은 이미 00003 마이그레이션에서 생성됨

-- 프로필 업데이트 (auth.users 생성 후)
-- UPDATE profiles SET role = 'admin', name = '관리자', position = 'Admin'
--   WHERE email = 'admin@nxtcloud.kr';
-- UPDATE profiles SET role = 'c_level', name = '진성대표', position = 'CEO', team_id = (SELECT id FROM teams WHERE type = 'msp')
--   WHERE email = 'clevel@nxtcloud.kr';
-- UPDATE profiles SET role = 'team_lead', name = '팀장MSP', position = 'Team Lead', team_id = (SELECT id FROM teams WHERE type = 'msp')
--   WHERE email = 'lead.msp@nxtcloud.kr';
-- UPDATE profiles SET role = 'staff', name = '김서윤', position = 'Technical Trainer', team_id = (SELECT id FROM teams WHERE type = 'education')
--   WHERE email = 'karin.kim@nxtcloud.kr';

-- 고객 더미 데이터
INSERT INTO clients (client_id, name, client_type, grade, business_types, memo) VALUES
  ('UNIV-001', '서울대학교', 'univ', 'A', '{tt}', '주요 교육 고객'),
  ('UNIV-002', '연세대학교', 'univ', 'B', '{tt}', NULL),
  ('CORP-001', '삼성SDS', 'corp', 'A', '{msp,tt}', 'MSP + 교육 복합'),
  ('CORP-002', '네이버클라우드', 'corp', 'B', '{msp}', 'MSP 전용'),
  ('CORP-003', '카카오엔터프라이즈', 'corp', 'B', '{msp}', NULL),
  ('GOVT-001', '과학기술정보통신부', 'govt', 'A', '{tt}', '정부 교육 프로젝트'),
  ('ASSO-001', '한국클라우드산업협회', 'asso', 'C', '{tt}', NULL),
  ('CORP-004', 'LG CNS', 'corp', 'A', '{msp,tt,dev}', '대형 종합 고객');

-- 상위-하위 고객 관계 예시
UPDATE clients SET parent_id = (SELECT id FROM clients WHERE client_id = 'CORP-004')
  WHERE client_id IN ('CORP-001');

-- 연락처 더미 데이터
INSERT INTO contacts (client_id, name, email, phone, department, position, role, is_primary)
SELECT c.id, '홍길동', 'hong@example.com', '010-1234-5678', 'IT팀', '팀장', '기술담당', true
FROM clients c WHERE c.client_id = 'CORP-001';

INSERT INTO contacts (client_id, name, email, phone, department, position, role, is_primary)
SELECT c.id, '김영희', 'kim@example.com', '010-9876-5432', '구매팀', '과장', '결제자', false
FROM clients c WHERE c.client_id = 'CORP-001';

-- MSP 계약 더미 데이터 (팀 배분 포함)
INSERT INTO contracts (contract_id, client_id, type, name, total_amount, currency, stage, description)
SELECT 'MSP-001', c.id, 'msp', '삼성SDS MSP 서비스', 120000000, 'KRW', 'contracted', 'AWS 매니지드 서비스'
FROM clients c WHERE c.client_id = 'CORP-001';

INSERT INTO contracts (contract_id, client_id, type, name, total_amount, currency, stage, description)
SELECT 'MSP-002', c.id, 'msp', '네이버클라우드 MSP', 80000000, 'KRW', 'pre_contract', 'AWS 전환 프로젝트'
FROM clients c WHERE c.client_id = 'CORP-002';

-- 교육 계약 더미 데이터
INSERT INTO contracts (contract_id, client_id, type, name, total_amount, currency, stage, description)
SELECT 'CT2026001', c.id, 'tt', 'AWS 클라우드 교육 과정', 30000000, 'KRW', 'proposal', '기초 + 심화 과정'
FROM clients c WHERE c.client_id = 'UNIV-001';

-- MSP 확장 데이터
INSERT INTO contract_msp_details (contract_id, billing_level, credit_share, expected_mrr, payer, sales_rep, aws_amount, has_management_fee)
SELECT c.id, 'MSP15', 15.0, 10000000, '삼성SDS', '이영수', 100000000, true
FROM contracts c WHERE c.contract_id = 'MSP-001';

-- 팀 매출 배분
INSERT INTO contract_teams (contract_id, team_id, percentage)
SELECT c.id, t.id, 100
FROM contracts c, teams t
WHERE c.contract_id = 'MSP-001' AND t.type = 'msp';

INSERT INTO contract_teams (contract_id, team_id, percentage)
SELECT c.id, t.id, 100
FROM contracts c, teams t
WHERE c.contract_id = 'CT2026001' AND t.type = 'education';

-- 교육 운영 더미 데이터
INSERT INTO education_operations (contract_id, operation_name, location, target_org, start_date, end_date, total_hours, contracted_count, provides_lunch, provides_snack)
SELECT c.id, 'AWS 기초 과정 1차', '서울대학교 공학관', '서울대학교', '2026-05-01', '2026-05-05', 40, 30, true, true
FROM contracts c WHERE c.contract_id = 'CT2026001';

INSERT INTO education_operations (contract_id, operation_name, location, target_org, start_date, end_date, total_hours, contracted_count, provides_lunch, provides_snack)
SELECT c.id, 'AWS 심화 과정 2차', '서울대학교 공학관', '서울대학교', '2026-06-01', '2026-06-03', 24, 20, true, false
FROM contracts c WHERE c.contract_id = 'CT2026001';

-- MSP 고객 확장 데이터
INSERT INTO client_msp_details (client_id, industry, company_size, tags, aws_account_ids)
SELECT c.id, 'IT/소프트웨어', '대기업', '{클라우드,엔터프라이즈}', '{123456789012}'
FROM clients c WHERE c.client_id = 'CORP-001';
```

- [ ] **Step 2: 시드 실행 확인**

```bash
npx supabase db reset  # 마이그레이션 + 시드 적용
```

Expected: 모든 마이그레이션 성공, 더미 데이터 확인

- [ ] **Step 3: 커밋**

```bash
git add supabase/seed/
git commit -m "feat: 개발용 더미 시드 데이터"
```

---

## Task 16: 환경 변수 + .env.example

**Files:**
- Create: `.env.example`
- Create: `.env.local` (gitignore 대상)

- [ ] **Step 1: .env.example 작성**

`.env.example`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (서버 전용 — 빌드에 포함되지 않음)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Supabase CLI
SUPABASE_PROJECT_ID=your-project-id
```

- [ ] **Step 2: .gitignore 확인**

`.env.local`, `.env` 등이 `.gitignore`에 있는지 확인:

```bash
grep ".env" .gitignore
```

없으면 추가:

```
.env.local
.env
.env.*.local
```

- [ ] **Step 3: 커밋**

```bash
git add .env.example .gitignore
git commit -m "chore: 환경 변수 예시 + gitignore"
```

---

## Task 17: 전체 빌드 + 테스트 확인

**Files:** (없음 — 검증만)

- [ ] **Step 1: 전체 테스트 실행**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS

- [ ] **Step 2: 린트 확인**

```bash
npm run lint
```

Expected: 에러 없음

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공

- [ ] **Step 4: 최종 커밋**

```bash
git add -A
git commit -m "chore: foundation 빌드 + 테스트 검증 완료"
```

---

## 요약

| Task | 내용 | 예상 시간 |
|------|------|-----------|
| 1 | 프로젝트 초기화 + 개발 환경 | 5분 |
| 2 | shadcn/ui 초기화 | 3분 |
| 3 | 상수 + 타입 정의 | 5분 |
| 4 | **DB 스키마 설계 (사용자 공동)** | 15분 |
| 5 | RLS 정책 구현 | 10분 |
| 6 | Supabase 클라이언트 + 미들웨어 | 5분 |
| 7 | 인증 Provider + RBAC 훅 | 10분 |
| 8 | API 에러 핸들러 + Zod 스키마 | 5분 |
| 9 | Providers + Root Layout | 3분 |
| 10 | 로그인 페이지 | 5분 |
| 11 | 사이드바 레이아웃 | 10분 |
| 12 | 공통 컴포넌트 | 10분 |
| 13 | Auth Guard + Role Guard | 5분 |
| 14 | 대시보드 + 프로필 스캐폴드 | 5분 |
| 15 | 더미 시드 데이터 | 5분 |
| 16 | 환경 변수 | 2분 |
| 17 | 전체 검증 | 3분 |

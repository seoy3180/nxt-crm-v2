# P4 실행 결과 — 실제 CRM 스키마 + RLS 이전

> `migration-plan.md` P4 실행 결과. 작성 2026-06-30, 완료 2026-06-30.
> 전제: P0/P1/P2 완료, P3 Amplify Next.js 풀스택 PoC 통과.
> 대상 DB: **ClickHouse-managed Postgres `nxt_crm_dev` only**.
> 상태: ✅ **완료**.
>
> **중요**: `nxt_crm`은 Supabase와 동기화 중인 미러 DB다. P4의 schema apply, reset, seed, test write는 전부 `nxt_crm_dev`에서만 수행한다.

---

## 1. P4 목표

P3의 smoke schema(`p3_poc.widgets`)를 넘어서, 실제 CRM의 `public` schema를 `nxt_crm_dev`에 올리고 Next.js 서버 코드가 같은 RLS 모델로 접근할 수 있게 만든다.

검증 명제:

> Supabase `public` schema의 핵심 DDL을 ClickHouse-managed Postgres `nxt_crm_dev`에 적용하고, `auth.uid()`/`"auth"."uid"()` 의존성을 `current_user_id()` 세션주입 모델로 치환해도 실제 CRM 테이블에서 RLS가 fail-closed로 동작한다.

---

## 2. 범위

### 2.1 포함

| 객체 | 기준 수량 | 처리 |
|---|---:|---|
| enum | 16 | 그대로 이전 |
| table | 20 | 그대로 이전하되 `profiles -> auth.users` FK 제거 |
| view | 2 | `security_invoker` 유지 |
| function | 22 | `auth.uid()`/`"auth"."uid"()` → `current_user_id()` 치환. `handle_new_user()`는 제외 |
| trigger | 18 | public table 트리거 유지 |
| RLS policy | 62 | `auth.uid()`/`"auth"."uid"()` → `current_user_id()` 치환 + RLS 활성화 |
| index/constraint/FK | schema.sql 기준 | 유지. 단 Supabase `auth` schema FK는 제거 |
| grants | 새로 작성 | Supabase `anon/authenticated/service_role` grant 폐기, `nxt_crm_app` 최소 권한 부여 |

### 2.2 제외

- 운영 데이터 full migration
- `nxt_crm` 미러 DB 수정
- Supabase Auth → Cognito 실제 전환
- Cognito 사용자 생성/`cognito_sub` 백필
- 전체 도메인 API 구현
- ClickHouse OLAP/ClickPipe 분석 파이프라인

---

## 3. 입력 산출물

| 입력 | 용도 |
|---|---|
| `supabase/schema.sql` | 현재 정본 DDL |
| `docs/db-schema.md` | 사람이 읽는 구조 요약 |
| `docs/migration-p1-inventory.md` | RPC 7개, RLS 62, `auth.uid()`/`"auth"."uid"()` 16곳 치환 기준 |
| `docs/migration-p2-plan.md` | `current_user_id()` + `SET LOCAL` + RLS 검증 근거 |
| `docs/migration-p3-plan.md` | Amplify `apps/web` 런타임 검증 결과 |

---

## 4. 변환 규칙

### 4.1 Supabase Auth 제거

`schema.sql`을 그대로 적용하면 다음 이유로 실패하거나 새 구조와 어긋난다.

- `auth.uid()`/`"auth"."uid"()`는 Supabase 전용 함수다.
- `profiles.id`가 `auth.users(id)`를 FK로 참조한다.
- grant 대상이 `anon`, `authenticated`, `service_role`로 되어 있다.
- `handle_new_user()`는 Supabase `auth.users` 가입 트리거 전용 함수다.

P4 변환 규칙:

| 원본 | P4 변환 |
|---|---|
| `auth.uid()` / `"auth"."uid"()` | `public.current_user_id()` |
| `profiles.id -> auth.users(id)` / `"auth"."users"` FK | 제거. `profiles.id uuid PK` 유지 |
| `GRANT ... TO anon/authenticated/service_role` | 제거 |
| `OWNER TO postgres` | 제거 또는 target admin 소유로 자연 생성 |
| `auth` schema 객체 | 생성하지 않음 |
| `handle_new_user()` | P4 migration에서 제외. P5에서는 기존 profile과 Cognito `sub` 매핑만 검증하고, 가입/초대용 profile 생성 함수는 P5b/P8 이전 별도 게이트로 재설계 |

### 4.2 세션 사용자 헬퍼

P4 schema 시작부에 다음 헬퍼를 추가한다.

```sql
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$;
```

기존 `user_role()`/`user_team_id()`는 `auth.uid()` 대신 `current_user_id()`를 사용한다. RLS policy 덤프에 등장하는 `"auth"."uid"()`도 같은 방식으로 치환한다.

### 4.3 RLS 적용

`ENABLE ROW LEVEL SECURITY`가 있는 모든 테이블은 새 DB에서도 RLS를 활성화한다.

```sql
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
```

중요: P2에서는 `FORCE RLS` 자체가 허용되는지 확인했지만, 실제 CRM schema에는 `can_access_contract()`처럼 SECURITY DEFINER 함수가 RLS 보호 테이블을 다시 조회하는 정책 가드가 있다. 모든 테이블에 `FORCE RLS`를 걸면 table owner로 실행되는 SECURITY DEFINER 함수도 RLS를 다시 받아 재귀 호출이 발생한다.

따라서 P4 실제 적용 기준은 다음과 같다.

- 앱 runtime role `nxt_crm_app`은 table owner가 아니다.
- table owner/admin role은 앱 런타임에 사용하지 않는다.
- RLS는 모든 public table에 `ENABLE`한다.
- `FORCE RLS`는 적용하지 않는다. BYPASSRLS 전용 owner role을 둘 수 있게 되면 재검토한다.

### 4.4 Extension/schema

현재 `schema.sql`의 trigram index는 `extensions.gin_trgm_ops`를 참조한다. P4 migration은 적용 전에 extension 배치를 명시해야 한다.

```sql
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
```

ClickHouse-managed Postgres에서 `pgcrypto`가 이미 제공되더라도 idempotent하게 둔다. 적용 전 `gen_random_uuid()` 해석 위치는 dry-run에서 확인한다.

이 항목은 P4 apply 전에 별도 선확인한다. managed PG에서 `CREATE SCHEMA extensions` 또는 `CREATE EXTENSION pg_trgm WITH SCHEMA extensions`가 막히면 trigram index 4개가 실패하므로, index 생성 전에 extension 위치를 확정해야 한다.

---

## 5. 실행 단계

### P4-0. 안전 게이트

모든 apply SQL 시작부에 DB명 검사를 넣는다.

```sql
DO $$
BEGIN
  IF current_database() <> 'nxt_crm_dev' THEN
    RAISE EXCEPTION 'P4 migration must run on nxt_crm_dev, current=%', current_database();
  END IF;
END $$;
```

게이트:

- `current_database() = 'nxt_crm_dev'`
- admin role로 DDL 실행
- runtime role은 `nxt_crm_app`
- `nxt_crm`에 연결된 세션이 하나라도 있으면 중단

### P4-1. 변환 SQL 생성

산출물 후보:

```text
~/nxt-crm/apps/web/db/migrations/
  0001_crm_schema.sql
  0002_crm_rls.sql
  0003_crm_grants.sql
  0004_crm_seed_smoke.sql
```

분리 이유:

- schema와 RLS를 따로 검증하기 위함
- 실패 지점을 명확히 보기 위함
- P5/P7에서 grants와 seed를 교체하기 쉽게 하기 위함

### P4-2. 정적 검증

생성된 SQL에 대해 금지 문자열을 검사한다.

```text
auth.uid(
"auth"."uid"()
auth.users
"auth"."users"
TO anon
TO authenticated
TO service_role
OWNER TO postgres
handle_new_user
```

허용되는 예외는 주석뿐이다. 실행 SQL 본문에 남아 있으면 실패다.

정규식으로 검사할 경우 다음 계열을 모두 잡아야 한다.

```regex
"?auth"?\."?uid"?\s*\(
"?auth"?\."?users"?
```

이유: `schema.sql` 안에는 함수 본문의 `auth.uid()`와 정책 DDL의 `"auth"."uid"()`가 둘 다 존재한다. 한쪽만 검사하면 치환 누락이 정적 검증을 통과할 수 있다.

### P4-3. `nxt_crm_dev` 적용

적용 순서:

1. extension/schema/helper
2. enum
3. 선행 pure function (`immutable_array_to_string` 등 table DDL이 참조하는 함수)
4. table
5. primary/unique/check constraint
6. view (`client_list_view`, `contracts_with_details` — 둘 다 `security_invoker` 유지)
7. 권한/RPC/trigger function (`can_access_*`, `user_role`, `user_team_id`, `update_updated_at` 등)
8. index
9. trigger
10. FK
11. RLS policy + `ENABLE ROW LEVEL SECURITY`
12. app role grants
13. smoke seed

`contract_msp_details.aws_account_search` generated column이 `immutable_array_to_string()`을 참조하므로, 이 함수는 table 생성 전에 있어야 한다. 반대로 `can_access_*`류 함수는 `profiles`/`teams`/`contracts` 등을 조회하므로 table 생성 뒤로 둔다.

### P4-4. 앱 role grant

`nxt_crm_app`에는 owner 권한을 주지 않는다.

최소 권한 원칙:

- `CONNECT` on database `nxt_crm_dev`
- `USAGE` on schema `public`
- 필요한 table/view에 `SELECT/INSERT/UPDATE/DELETE`
- 필요한 function에 `EXECUTE`
- sequence가 생기면 sequence usage

P4에서는 개발 속도를 위해 public schema 전체 DML grant를 줄 수 있지만, P7 진입 전에 API별 최소 권한으로 좁힐지 재검토한다.

### P4-5. 실제 CRM RLS smoke

P3의 `p3_poc.widgets` 대신 실제 CRM 테이블로 검증한다.

필수 seed:

- teams 2개
- profiles 2명
- team_business_domains
- clients 2개
- contracts 2개
- contract_teams 또는 담당자 매핑
- deposit_accounts/education_operations는 선택

검증:

- 미주입 상태에서 보호 테이블 SELECT 0행 또는 권한 거부
- 사용자 A로 A 접근 가능
- 사용자 A로 B 수정/삭제 0행 또는 권한 거부
- 사용자 B로 B 접근 가능
- `nxt_crm_app`이 owner가 아니어도 모든 API 쿼리 동작
- RLS가 켜진 테이블 목록 확인

### P4-6. Next.js API 연결

`apps/web`에는 도메인 API 전체를 바로 만들지 않는다. P4에서는 DB 구조 검증용 최소 route만 추가한다.

후보:

- `/api/crm-smoke/clients`
- `/api/crm-smoke/contracts`
- `/api/crm-smoke/me`

목표:

- 실제 CRM 테이블에서 `withCurrentUser()`가 동작
- `x-dev-user-id` 기준 사용자 A/B 격리가 유지
- 응답 DTO에 권한 플래그를 붙일 수 있는 형태 확인

---

## 6. 통과 기준

P4 완료 조건:

- [x] 변환 SQL에 Supabase Auth 의존 문자열 없음
- [x] `nxt_crm_dev`에 실제 CRM schema 적용 성공
- [x] `profiles -> auth.users` FK 제거 확인
- [x] RLS table 전체 `ENABLE ROW LEVEL SECURITY` 확인
- [x] `nxt_crm_app`으로 미주입 deny 확인
- [x] `withCurrentUser()`로 실제 CRM 테이블 A/B 격리 확인
- [x] Amplify 배포 환경에서도 최소 CRM smoke API 200 확인
- [x] `nxt_crm` 미러 DB 무변경 확인

### 6.1 실제 결과

- 변환 SQL 산출물: `~/nxt-crm/apps/web/db/migrations/0001_crm_schema.sql` ~ `0004_crm_seed_smoke.sql`
- 정적 검증: `auth.uid(`, `"auth"."uid"(`, `auth.users`, `"auth"."users"`, `FORCE ROW LEVEL SECURITY`, `handle_new_user`, Supabase 기본 grant 대상 잔존 없음
- DB 적용 결과: public CRM table 20개, RLS enabled table 20개, policy 62개, `profiles -> auth.users` FK 0개
- RLS 적용 기준: `ENABLE ROW LEVEL SECURITY` + runtime app role `nxt_crm_app` non-owner. `FORCE RLS`는 미적용
- `FORCE RLS` 미적용 사유: SECURITY DEFINER 가드 함수(`can_access_contract()` 등)가 RLS 보호 테이블을 다시 조회해 전역 `FORCE RLS` 적용 시 재귀(`stack depth limit exceeded`) 발생
- 로컬 DB smoke: 미주입 시 0행, 사용자 A는 `P4-MSP-CONTRACT`만 조회, 사용자 B는 `P4-EDU-CONTRACT`만 조회, 사용자 A의 B 계약 수정은 `UPDATE 0`
- Next.js smoke API: `/api/crm-smoke/me`, `/api/crm-smoke/contracts`, `/api/crm-smoke/clients` 추가
- Amplify 배포: `seoy3180/nxt-crm` commit `f6c73d7`, Amplify job `3` 성공, 배포 URL에서 smoke API 200 확인

P4는 완료됐으므로 다음 단계는 P5(Cognito/Auth)다. P7(도메인 API 이관)은 P5에서 실제 사용자 식별 경로가 닫힌 뒤 본격화한다.

---

## 7. 실패 시 대응

| 실패 | 대응 |
|---|---|
| extension 생성 실패 | ClickHouse-managed Postgres 허용 extension 확인, trigram index 보류 가능 여부 판단 |
| `gen_random_uuid()` 실패 | `pgcrypto` 위치 조정 또는 `extensions.gen_random_uuid()` 명시 |
| 함수 생성 순서 실패 | helper/function/table 의존 순서 재분리 |
| RLS 정책 실패 | `auth.uid()` 잔존 또는 함수 반환 타입 점검 |
| `stack depth limit exceeded` | SECURITY DEFINER 가드 함수와 `FORCE RLS` 재귀 가능성 확인. P4 기준은 `ENABLE RLS` + app role non-owner |
| app role 조회 실패 | grant 누락인지 RLS 차단인지 분리 확인 |
| Amplify에서만 실패 | env/CA/network 문제. P3 체크리스트로 회귀 |

---

## 8. P4 이후 연결

- P5: Cognito JWT 검증, `cognito_sub -> profiles.id` 매핑, dev header 제거
- P6: 실제 CRM 테이블 기준 RLS 격리 자동 테스트
- P7: clients/contracts/deposit/education 도메인 API 이관
- P8: FE 화면 이식 및 API 연결
- P9: 운영 데이터 이관/컷오버

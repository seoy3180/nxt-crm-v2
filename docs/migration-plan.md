# CRM 마이그레이션 계획 — Supabase 탈피 + FE/BE 분리 + Cognito

> **인프라 전환**: (현재) Vercel + Supabase → (목표) **AWS Amplify + ClickHouse-managed Postgres**
> 운영 원장 DB: **ClickHouse-managed Postgres** (PostgreSQL-호환 OLTP). 분석: ClickHouse(OLAP)로 CDC.
> **방식**: 현 레포는 컷오버까지 운영 유지, 새 레포에서 병렬 구축(parallel build) → §0.5.
> 참조 표준: `nxtcloud-org/certi-nav-be-v2`, `certi-nav-fe`, `ai-admission-counselor-chatbot-*`

## 0. 이 문서의 정체성 (먼저 읽을 것)

**이건 "ClickHouse(OLAP DBMS)로 전환"이 아니다.** 운영 원장 DB는 **ClickHouse-managed Postgres = 표준 PostgreSQL**(ClickHouse사가 호스팅하는 Postgres, OLAP 엔진 아님)이다. 즉 실제 정체성은:

> **Vercel+Supabase 풀스택 → AWS Amplify(호스팅) + FE/BE 분리 + Cognito 인증 + 운영 Postgres 유지(ClickHouse-managed Postgres) + 분석은 ClickHouse로 CDC**

인프라도 **Vercel → AWS Amplify**, **Supabase → ClickHouse-managed Postgres**로 전환한다. **호스팅·인증·백엔드는 AWS 중심**으로 가되, **운영 DB는 AWS 네이티브가 아니라 ClickHouse측 managed Postgres**다.

"ClickHouse 마이그레이션"이라는 착시는 제품명에 'ClickHouse'가 들어가서 생긴 것이다. 운영 DB가 PostgreSQL 호환이므로 **원칙적으로 RLS·트랜잭션·트리거·ORM 전략을 유지할 수 있고**, 그래서 아래 RLS 유지 전략이 성립한다. 단 ClickHouse-managed Postgres는 preview라 실동작 검증이 필요하다(§3.5 운영 DB).

### 확정된 결정

| 결정 항목 | 확정 | 근거 |
|---|---|---|
| 운영 원장 DB | **ClickHouse-managed Postgres** (PG-호환, Data API 없는 pg TCP) | 회사 ClickHouse 생태계 + OLTP는 Postgres 필수 |
| ClickHouse OLAP를 운영 DB로? | **아니오** | OLTP 트랜잭션·RLS·빈번한 행 단위 UPDATE에 부적합 |
| 호스팅 | (현) Vercel → **AWS Amplify** | 호스팅·인증·BE는 AWS 중심 (운영 DB는 ClickHouse측) |
| 권한 전략 | **A안: RLS 유지** (§8 권한 전략 의사결정 표) | CRM은 팀별 행 격리가 핵심 → RLS가 안전·저비용 |
| 인증 | AWS Cognito | Supabase Auth 탈피 |
| 분석 | ClickHouse OLAP, CDC로 복제 | 운영과 분리 |
| 레포 구조 | **모노레포(turborepo)** — `apps/fe`+`apps/be`+`packages/shared` | 타입 공유 + 작은 팀 관리 편의 (§0.5) |
| **이행 방식** | **parallel build** — 현 레포 운영 유지, 새 레포 병렬 구축 | 운영 중단 불가 (§0.5) |

### 검증으로 드러난 hard blocker (착수 전 해소 필수)

1. **`schema.sql`이 stale** — `contracts_stage_check`가 `'tt'` 참조 / enum엔 `'edu'`만(`00031_a`에서 rename). 그대로 새 DB 적용 시 **실패**. → 단계별 실행 계획(§4)의 **Phase -1**에서 **운영 DB 재추출·적용 검증 없이는 어떤 마이그레이션도 시작 금지**.
2. **세션주입(`SET LOCAL`)이 선택 드라이버에서 작동하는지 미검증** — 전체 RLS 보안의 단일 의존점. → Phase 0.5 PoC 게이트.
3. **SECURITY DEFINER RPC는 RLS 우회** — `update_contract_teams`는 권한 가드·`search_path` 둘 다 없음(취약). → §7 보안 선수정.

---

## 0.5. 이행 방식 — Parallel Build (현 레포 운영 유지)

현 `nxt_crm_v2`(Vercel + Supabase)는 **컷오버 전까지 운영을 멈출 수 없다.** 따라서 현 레포를 뜯어고치지 않고, **새 레포에서 새 구조를 독립적으로 완성한 뒤 통째로 전환**한다(strangler/parallel build).

- **현 레포** = 컷오버까지 운영 + 참조 소스. **마이그레이션 관련 구조 변경 금지.** 단 운영 필수 기능·보안 수정(예: `update_contract_teams` 가드)·schema 재추출은 **승인 후 예외 반영**
- **"복사 후 분리" 안 함** — 복사본은 supabase 결합·비-FSD 부채를 들고 와 중간 상태가 어정쩡해진다. 새로 짓고 **자산만 이식**한다.

| 무엇 | 방법 | 가져올 자산 |
|---|---|---|
| **BE** | 새로 (현 레포엔 BE가 없음 — Supabase가 BE 역할이었음) | `schema.sql`(RLS·트리거, 정본) + 서비스 레이어 비즈니스 로직 포팅 |
| **FE** | 새 모노레포 `apps/fe`(FSD) + 이식 | UI 컴포넌트·화면·스타일·React Query 훅 (데이터 계층만 `supabase-js`→axios 교체) |
| **현 레포** | 컷오버까지 운영, 이후 아카이브 | — |

**레포 구조 확정 — 모노레포(turborepo):**
```
crm/                  (새 레포 1개)
├── apps/
│   ├── be/           (Lambda 또는 컨테이너 → 자체 배포 파이프라인)
│   └── fe/           (Next.js FSD → AWS Amplify Hosting)
├── packages/
│   └── shared/       (BE↔FE API 계약 타입 공유 — supabase 자동생성 타입 대체)
└── turbo.json
```
- **타입 공유**가 핵심 이점: 현재 `lib/supabase/types.ts`로 FE가 받던 DB 타입을 `packages/shared`의 API 계약 타입으로 대체
- ⚠️ "한 레포"여도 **배포 타겟은 분리**: FE→Amplify(`appRoot=apps/fe`), BE→Lambda/컨테이너. turborepo + 폴더별 빌드로 변경 감지
- **Amplify monorepo 빌드 체크리스트**: `appRoot` ↔ `AMPLIFY_MONOREPO_APP_ROOT` 일치, `amplify.yml`의 `buildPath`·`baseDirectory`, pnpm/turborepo면 필요 시 `.npmrc`의 `node-linker=hoisted` 검증

> BE 스택(+ Amplify 범위)은 §2·§5에서 결정.

---

## 1. 현재 → 목표 매핑

| 영역 | 현재 | 목표 |
|---|---|---|
| 호스팅/배포 | **Vercel** | **AWS Amplify** (FE 호스팅; BE 배포 형태는 §2) |
| 레포 구조 | 단일 Next.js 풀스택 (현 레포 운영 유지) | **새 모노레포**(turborepo): `apps/fe` + `apps/be` + `packages/shared`(타입 공유), 병렬 구축 |
| DB 접근 | 클라이언트 `supabase-js`가 Supabase Postgres 직접 | BE가 ORM으로 ClickHouse-managed Postgres 접근, FE는 REST |
| 운영 DB 엔진 | Supabase Postgres | **ClickHouse-managed Postgres** (PG-호환, pg TCP) |
| 권한 | RLS 62정책 + `auth.uid()` 16곳 | **RLS 유지** + 세션주입 미들웨어(신규) + FE 기능권한 |
| 인증 | Supabase Auth (`auth.users`, `profiles.id=uid`) | AWS Cognito (`cognito_sub` ↔ `profiles.id` 매핑) |
| API | PostgREST (자동, 임베디드 리소스) | 수동 BE 핸들러 + DTO 계약 |
| 분석 | (없음) | ClickHouse OLAP, 운영 PG에서 CDC |

---

## 2. 참조 레포 + BE 스택

| 레포 | 스택 | 참고 가치 |
|---|---|---|
| `certi-nav-be-v2` | Node + SAM Lambda + Drizzle(**RDS Data API**) + Cognito | Cognito·라우터·Zod만 차용. **DB 계층은 못 씀**(Data API는 Aurora 전용 — 우리 DB는 pg TCP). RLS 선례 없음 |
| `ai-admission-chatbot-be` | Python + FastAPI + SQLModel + **pg TCP** + Cognito | pg TCP라 세션주입 자연스러움. 단 boilerplate |
| `certi-nav-fe` | Next 16 App Router + FSD + React Query + axios(401 refresh) | **FE 표준 기준점** |
| `chatbot-admin-fe` | Next 16 + permission + group + 다계층 가드 | **FE 기능권한 패턴** |

### BE 스택 — Data API 분기 폐기, pg TCP 확정

운영 DB가 ClickHouse-managed Postgres(**RDS Data API 미제공, 표준 pg TCP**)로 확정됐으므로:
- ❌ certi-nav식 RDS Data API 경로는 **선택지에서 제외** (Data API는 Aurora 전용)
- 남은 후보 (둘 다 `pg` TCP):
  - **Node/SAM Lambda + API Gateway + `pg`**: 단 Lambda는 cold start·커넥션 고갈 → **PgBouncer류 풀러 필수** + **네트워크 경로**(VPC/private link/public egress+NAT — managed Postgres 엔드포인트 유형에 따라) PoC 필요
  - **컨테이너(ECS/Fargate+ALB 또는 App Runner) + `pg`**: 상시 실행이라 풀링·세션변수 자연스러움. chatbot-be(FastAPI)가 선례(boilerplate)
- BE 배포 후보를 **SAM Lambda+API GW / ECS·Fargate+ALB / App Runner** 중 무엇으로 PoC할지도 §5에서 결정
- 결정 기준: **Phase 0.5 세션주입 PoC**(§4) 결과 + Lambda vs 컨테이너 운영 선호

### Amplify의 BE 함의
- **Amplify Hosting**(FE 호스팅, Vercel 대체)은 확정. BE 배포 형태는 별개 결정이다.
- ⚠️ **Amplify-hosted Next의 SSR/API Route에서 DB 직접 접근 금지** — 모든 데이터 접근은 **별도 BE REST API로만**. (Next 서버 코드에서 DB를 직접 만지면 Supabase 풀스택 결합을 그대로 재현하게 됨 → 분리 무의미)
- ⚠️ **Amplify Gen2 백엔드(TypeScript)**를 BE로 채택하면 → BE 스택이 **Node로 강제**된다(Python/FastAPI 배제). 또한 Amplify Gen2의 기본 data 계층은 AppSync+DynamoDB라 **외부 pg(ClickHouse-managed Postgres) + RLS 모델과 결이 다르다**(우회 필요).
- 현실적 선택지:
  - (a) **Amplify Hosting(FE) + 별도 BE**(SAM Lambda 또는 컨테이너 + `pg`): BE 스택 자유, ClickHouse-managed Postgres 직결, RLS 모델 그대로
  - (b) **Amplify Gen2 functions(Node) + `pg`**: Cognito 통합 편리, 단 Node 강제 + Amplify 데이터 모델(AppSync+DynamoDB) 우회. **(b)를 후보로 남기려면 "외부 Postgres 연결·VPC/egress·Secret 관리·PgBouncer 연결" PoC를 게이트로 명시**
- → "Amplify를 FE 호스팅만 쓸지 / 백엔드까지 쓸지"가 BE 스택(특히 Node 강제 여부)을 좌우한다 (§5 확인)

---

## 3. 핵심 마이그레이션 작업

### 3.1 권한 — RLS 유지(A안) + FE 기능권한 (2층)

#### (A) BE 데이터 권한 = RLS

**세션 식별자 주입** — `auth.uid()`(16곳)를 **단일 헬퍼 함수**로 치환:
```sql
CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;  -- 2-arg 필수
$$;
-- 모든 정책/함수에서 auth.uid() → current_user_id()
```
치환 규칙: `auth.uid() IS NOT NULL` → `current_user_id() IS NOT NULL`(NULL→deny) / `id = auth.uid()` → `id = current_user_id()`(NULL→false→deny).

**BE는 트랜잭션 단위 주입** (`SET LOCAL`, 풀 오염 방지):
```sql
BEGIN; SET LOCAL app.current_user_id = '<profiles.id>'; ... COMMIT;
```
- ⚠️ **BE는 주입 전 UUID를 검증**한다. `profiles.id`(이미 uuid)를 주입하므로 정상 경로엔 문제없지만, 잘못된 UUID 문자열은 `::uuid` cast error를 낸다 → **BE에서 UUID 형식 검증 후 `SET`, 검증 실패/미인증 시 주입하지 않고 401/403** (헬퍼는 미설정→NULL→deny로 fail-closed)
- `SET`(LOCAL 없이)·빈문자·더미 id 절대 금지

**롤 격리**: 모든 RLS 테이블에 **`FORCE ROW LEVEL SECURITY`**(owner 우회 차단). DDL 롤 ≠ 런타임 롤(비-owner·`NOSUPERUSER`·`NOBYPASSRLS`). CDC용 BYPASSRLS 롤과 앱 롤 분리.

**⚠️ SECURITY DEFINER RPC는 RLS 우회**: `create_contract_with_details`·`change_contract_stage`·`soft_delete_*`·`replace_contract_tech_leads`·`update_contract_teams`는 DEFINER라 호출자 RLS를 안 받는다. 방어선은 함수 내부 `can_access_*` 가드 → BE 이관 시 동등 재현 (§7 체크리스트).

#### (B) FE 기능 권한 = chatbot-admin-fe 패턴 〔UX 보조〕
- `user_role`(staff/team_lead/admin/c_level) 기반 메뉴·라우트 가드 (`usePermission`/`hasPagePermission`)
- role 소스는 **항상 `profiles` DB 조회**(JWT 클레임 신뢰 금지)
- FE 권한은 UX(숨김)일 뿐 — 실제 격리는 (A) RLS + RPC 가드

### 3.2 인증: Supabase Auth → AWS Cognito
- `profiles.id`는 기존 GoTrue uuid **유지**, `cognito_sub`(uuid)는 **별도 컬럼** 추가. FK→`auth.users` 제거
- **데이터 이관 시 매핑 백필**: 기존 사용자 Cognito 일괄 생성 → `cognito_sub ↔ profiles.id` 매핑 (안 하면 `changed_by`·`created_by` 이력 단절)
- 요청 흐름: JWT 검증(JWKS 서명·`iss`·`exp`·`token_use`=access·`client_id` — `aud`는 resource binding 사용 시에만) → `cognito_sub`로 `profiles.id` 조회 → UUID 검증 → `SET LOCAL`. 조회 실패 시 401/403
- ⚠️ **크로스 도메인(FE=Amplify ↔ BE=별도 도메인) CORS/Auth 전달 방식 결정 필요**: 쿠키 기반이면 `SameSite`/`domain`/`Secure` 설정, Bearer 토큰 기반이면 refresh 흐름(401 자동 갱신)을 명시. certi-nav-fe는 httpOnly 쿠키 + 401 refresh 패턴 → 차용 검토 (§5)
- `handle_new_user` 트리거 제거 → 가입 전용 `SECURITY DEFINER` 함수로 `profiles` INSERT(가입 시점엔 본인 `profiles.id`가 없어 RLS를 못 거치므로)

### 3.3 `supabase-js` → REST API
- 실측: `@supabase/*` 직접 import 4 + 래핑 client 경유 약 27 + `rpc()` 7. 페이지·훅이 `.from()` 직접 호출
- **PostgREST 의존 패턴 = 전용 엔드포인트 재설계**(단순 치환 불가): 임베디드 리소스(중첩 select), `count: exact, head: true`, 배열 연산자(`.contains()`), `.or()` 검색, 조건부 UPDATE+rowCount 낙관적 락(`voidTransaction`)
- **신원값은 BE가 JWT에서만 주입**: `change_contract_stage`의 `p_user_id` 제거, `created_by`/`voided_by`/`changed_by`는 세션에서 (FE 입력 신뢰 금지 — 위조 방지)
- 비-RPC 직접 변이(`.from().update().eq('id')`)는 RLS가 유일 방어 → Phase 3에서 UPDATE/DELETE 격리까지 검증

### 3.4 DB 스키마 → BE ORM 〔재추출 선행〕
- **선행: 운영 DB `pg_dump` 재추출** + 적용 migrations 정합성 대조. `schema.sql` stale(`'tt'`→`'edu'` 정정). 이 정정본을 ORM raw SQL 입력으로
- 객체: 테이블 20 · enum 16 · 뷰 2(`client_list_view.contract_count` read 의존 — raw SQL + 파생컬럼 BE 응답 보존) · 트리거 19(`on_auth_user_created`는 Cognito로 폐기) · 함수 23 · **RLS 정책 62**
- generated column·부분 unique·CHECK·RLS·트리거는 ORM 자동생성 불가 → **raw SQL 마이그레이션**
- **발번 함수 동시성**: `generate_*_id`는 `MAX+1`(시퀀스 아님) → 멀티인스턴스 동시성 UNIQUE 위반 → advisory lock 또는 SEQUENCE 리팩터. 이관 시 시작값=기존 MAX+1

### 3.5 운영 DB: ClickHouse-managed Postgres 〔pg TCP · preview〕
- **표준 PostgreSQL**(Ubicloud 기반, **private preview**). **RDS Data API 없음** → 표준 `pg` TCP 연결
- **앱 연결**: Lambda 사용 시 **PgBouncer류 풀러 필수**. transaction-mode 풀러 + prepared statement 충돌 주의(`?pgbouncer=true`/simple query). `SET LOCAL`은 트랜잭션 단위라 transaction mode와 호환
- ⚠️ **CDC 연결은 풀러 경유 금지**: ClickPipes CDC(분석 복제)는 PgBouncer/RDS Proxy/Supabase Pooler 같은 proxy를 거치면 안 된다. **replication slot/publication 접근 가능한 실제 Postgres 엔드포인트에 직접 연결**해야 한다 (앱 연결과 별개 경로)
- **[확인필요]**(preview): RLS/`FORCE RLS` 실동작, 비특권 롤 분리, 풀러 모드(session/transaction), GA 일정·SLA. 안 되면 §8 B안 fallback

### 3.6 운영 이관 vs 분석 복제 — 분리 (혼동 금지)
| 경로 | 목적 | 도구 |
|---|---|---|
| Supabase Postgres → **ClickHouse-managed Postgres** | 운영 원장 이관 | **`pg_dump`/restore + logical replication**(초기 스냅샷 + CDC 따라잡기). managed Postgres의 external-Postgres 마이그레이션 워크플로 활용 가능 |
| ClickHouse-managed Postgres → **ClickHouse OLAP** | 분석 복제 | **Postgres CDC ClickPipe** — managed Postgres의 publication/replication slot을 사용해 ClickHouse OLAP로 복제 (풀러 경유 금지 — 실제 PG 엔드포인트 직결) |

> ⚠️ 구분:
> - **운영 이관(→ ClickHouse-managed Postgres)**: pg_dump/restore, logical replication, 또는 managed Postgres가 제공하는 external-Postgres 마이그레이션 워크플로
> - **분석 복제(→ ClickHouse OLAP)**: Postgres CDC ClickPipe (UPDATE/DELETE는 ClickHouse의 ReplacingMergeTree로 반영)
>
> 즉 **"Postgres CDC ClickPipe"를 운영 DB 이관과 혼동하지 말 것.**

---

## 4. 단계별 실행 계획

| Phase | 작업 | 게이트 |
|---|---|---|
| **-1. ⛔ 재추출 hard gate** | 운영 DB `pg_dump` 재추출 + migrations 정합성 + 새 PG에 **적용 가능성 검증**(stale CHECK 등 수정) | **통과 전 일체 착수 금지** |
| **0. 결정 + 전수조사** | BE 스택(pg TCP 전제) 후보, supabase-js 27파일·rpc 7·임베디드/count/배열 인벤토리, RLS 62 컬럼참조 검증, 보안결함 목록 | 체크리스트 |
| **0.5. ⛔ 세션주입 PoC** | 선택 드라이버(`pg` TCP)로 `BEGIN→SET LOCAL→current_setting→RLS 쿼리`가 동일 컨텍스트로 동작·미설정 시 deny 검증 (+ 풀러 transaction-mode 호환) | **실패 시 BE 스택 재선택 / §8 B안** |
| **0.6. 인프라 PoC** | 네트워크 경로(VPC / public+NAT / private link)·BE 배포 후보(Lambda+API GW / ECS·Fargate+ALB / App Runner)·크로스도메인 CORS·Auth 전달(쿠키 vs Bearer) 검증 | BE 스택·배포·연결·Auth 방식 확정 |
| **1. BE 부트스트랩** | 스키마+RLS(FORCE)+트리거 이전, ClickHouse-managed Postgres 연결(비-owner 롤·풀러) | 스키마+RLS DB |
| **2. 인증** | Cognito, auth 엔드포인트, JWT 검증, `cognito_sub↔profiles.id` + UUID 검증 + `SET LOCAL` 미들웨어, 가입 DEFINER 함수 | 로그인+RLS 작동 |
| **3. ⛔ RLS 격리 검증** | `current_user_id()` 치환, 팀A 토큰으로 팀B **SELECT/UPDATE/DELETE 차단**, 미주입 시 deny, FORCE RLS·비특권 롤 자동검증 | **통과 전 Phase 4 금지** |
| **4. 도메인 API 이관** | clients→contracts→deposit→education. RPC→BE 트랜잭션 + **can_access 가드 동등 재현 1:1**, 신원 BE 주입 | 도메인 API |
| **5. FE 레포** | Next FSD, 화면 이관, supabase-js→axios+React Query, 임베디드/count 대응, FE 기능권한 | 동작 FE |
| **6. 운영 이관 + 컷오버** | Cognito 사용자 일괄생성 + sub↔id 매핑 백필, 발번 시퀀스 셋업, **pg_dump/logical replication으로 운영 이관**, 쓰기 전환 | 운영 전환 |
| **7. (후속) 분석 파이프라인** | ClickHouse-managed Postgres → ClickHouse OLAP **Postgres CDC ClickPipe**(PG 엔드포인트 직결, 풀러 경유 금지), 분석 모델 | 분석 가동 |

---

## 5. 미결정 · 확인 사항

1. **BE 스택 + Amplify 범위**: Amplify를 FE 호스팅만 쓸지(→ 별도 BE: Node 또는 Python/FastAPI + pg) vs Amplify Gen2 백엔드까지 쓸지(→ Node 강제). Phase 0.5 PoC + 운영 선호로 결정 (§2 Amplify의 BE 함의)
2. **[확인필요] ClickHouse-managed Postgres (preview)**: RLS/FORCE RLS 실동작, 비특권 롤 생성·접속, 풀러 모드, GA·SLA
3. 운영 이관 다운타임 허용 범위(logical replication 컷오버)
4. **BE 배포 형태**: SAM Lambda+API GW / ECS·Fargate+ALB / App Runner 중 PoC (§2)
5. **크로스 도메인 CORS/Auth 전달**: 쿠키(SameSite/domain/Secure) vs Bearer(refresh 흐름). Phase 0.6에서 검증
6. **managed Postgres 네트워크 경로**: public endpoint+TLS/IP allowlist vs private link/peering → BE 연결 방식·VPC 필요 여부 결정
7. i18n 필요 여부 (certi-nav는 en/ko)
8. 분석(Phase 7): CDC로 보낼 테이블, 비정규화 모델

---

## 6. 영향 범위 (실측)

| 항목 | 수치 |
|---|---|
| `@supabase/*` 직접 import | 4 |
| 래핑 client 경유 | 약 27 |
| `rpc()` 호출 | 7 |
| RLS 정책 | 62 (유지 + `current_user_id()` 치환 + 정합성 검증) |
| `auth.uid()` | 16곳 |
| 트리거 / 함수 | 19 / 23 |
| 뷰 / 테이블 / enum | 2 / 20 / 16 |
| 비대상(미사용 확인) | Realtime·Storage·Edge Functions **0건** |

---

## 7. 보안 선수정 + RPC 가드 체크리스트

이관 전 수정: `update_contract_teams`에 `SET search_path = public` + `can_access_contract` 가드 / RLS 62 컬럼참조 정합성 검증 / `contracts_stage_check` `'tt'`→`'edu'`.

BE 이관 시 RPC 가드 동등 재현(1:1): `create_contract_with_details`(can_access_client) · `change_contract_stage`(can_access_contract + p_user_id 제거→세션) · `soft_delete_*`(can_access_*) · `replace_contract_tech_leads`(can_access_contract) · `update_contract_teams`(**추가**).

---

## 8. 의사결정 표 — 권한 전략

| | A안: RLS 유지 〔채택〕 | B안: 앱레이어 권한 (fallback) |
|---|---|---|
| 격리 | DB 강제 (쿼리 빠뜨려도 막힘) | BE 코드가 매 쿼리 필터 (누수 위험) |
| 작업량 | 적음 (정책 재사용 + `current_user_id` 치환) | 많음 (62정책 전부 코드로) |
| 전제 | 세션주입 PoC(Phase 0.5) 통과 | — |
| 선택 조건 | 기본 | **Phase 0.5 실패** 또는 회사 정책 강제 시에만 |

**A안 채택.** CRM은 팀별 행 격리가 핵심이라 RLS가 안전·저비용. B안은 PoC 실패 시 비상 경로로만.

---

## 9. 핵심 판단

- **이 문서는 "ClickHouse 전환"이 아니라 "Supabase 탈피 + FE/BE 분리 + Cognito"다.** 운영 DB는 PostgreSQL 호환(ClickHouse-managed Postgres)이라 RLS·트랜잭션·ORM 전략을 원칙적으로 유지할 수 있다(단 preview 실동작 검증 필요).
- **1순위는 BE 스택이 아니라 (Phase -1) schema 재추출과 (Phase 0.5) 세션주입 PoC다.** 전자는 stale 때문에 hard blocker, 후자는 RLS 보안 모델의 단일 의존점.
- 운영 이관(pg_dump/logical replication)과 분석 복제(ClickPipes→ClickHouse OLAP)는 **다른 경로**다. 섞지 말 것.
- 보안 3중: RLS + RPC 내장 가드 + FE 기능권한. RPC는 RLS 우회하므로 RLS만 믿으면 안 됨.

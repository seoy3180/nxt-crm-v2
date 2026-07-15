# P3 실행 계획 — Amplify Next.js 풀스택 PoC + fallback BE 결정

> `migration-plan.md` P3. 작성 2026-06-25, 수정 2026-06-30.
> 전제: **P2 게이트 통과**(A안 RLS 확정).
> 방향: 별도 BE를 먼저 고정하지 않고, **Next.js 풀스택 on Amplify**가 ClickHouse-managed Postgres에 직접 붙을 수 있는지 먼저 검증한다.
>
> **진행 상태**: ✅ **P3 게이트 통과 (2026-06-30)** — Amplify SSR 배포 환경에서 Next.js route handler → `pg` → ClickHouse-managed Postgres `nxt_crm_dev` → `withCurrentUser` + RLS 조회까지 확인. 결과는 §9.

---

## 1. P3 목표

- **1차 목표**: `Next.js App Router + Amplify Hosting(SSR)` 구조로 CRM FE/BE를 하나의 앱에서 운영 가능한지 검증
- **DB 연결 경로**: Next.js 서버 코드(route handler/server action) → `pg` → ClickHouse-managed Postgres
- **권한 경로**: JWT 검증 → `profiles.id` 매핑 → `withCurrentUser` → RLS
- **fallback 기준**: Amplify SSR에서 DB 연결/secret/network 제약이 막히면 **EC2 + Express/Fastify** 별도 BE로 전환

---

## 2. P2에서 이미 검증된 것

- public endpoint + **TLS(CA 검증)** 접속 ✅
- **PgBouncer 6432 transaction-mode** + `SET LOCAL` ✅
- RLS / FORCE / 비특권 롤 ✅
- `withCurrentUser` tx wrapper (`apps/be`) ✅

→ P3는 RLS 원리를 다시 검증하지 않는다. 검증 대상은 **Amplify SSR 런타임에서 같은 방식이 동작하는지**다.

---

## 3. 현시점 구조 결정

### 3.1 우선 후보: Next.js 풀스택 on Amplify

```text
Browser
  -> Amplify Hosting / CloudFront
      -> Next.js App Router
          - React pages/components
          - route handlers: /api/*
          - server actions
          - auth/JWT validation
          - service layer
          - withCurrentUser transaction wrapper
              -> ClickHouse-managed Postgres
```

이 구조에서는 `apps/web` 하나가 FE이자 BE다. 브라우저는 DB에 직접 접근하지 않고, DB 연결은 반드시 Next.js 서버 코드 안에만 둔다.

### 3.2 DB 환경 경계

```text
Production / Mirror
Supabase
  -> logical replication
      -> ClickHouse-managed Postgres: nxt_crm
         보호 대상. 개발용 schema apply, reset, seed, test write 금지.

Development / PoC
ksy/nxt-crm Next.js fullstack app
      -> ClickHouse-managed Postgres: nxt_crm_dev
     P3/P4/P5 개발, RLS 검증, API 구현 대상.
```

`nxt_crm`은 Supabase와 미러링되는 DB이므로 Next.js PoC가 직접 건드리지 않는다. `ksy/nxt-crm`에서 만든 구조가 프로덕션 승격 가능하다고 판단된 뒤에만 별도 승격 절차로 `nxt_crm_dev`의 검증 결과를 `nxt_crm`에 반영한다.

### 3.3 fallback 후보: 별도 BE

```text
Browser
  -> Amplify FE
      -> EC2/ECS BE API
          -> ClickHouse-managed Postgres
```

Amplify SSR에서 DB 접속 또는 secret/network 제약이 해결되지 않을 때만 사용한다. 기존 `apps/be`의 `withCurrentUser` 자산은 fallback BE에서 재사용한다.

---

## 4. 추천 monorepo 구조

```text
~/nxt-crm/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── page.tsx
│       │   ├── contracts/
│       │   ├── clients/
│       │   └── api/
│       │       ├── health/route.ts
│       │       ├── db-ping/route.ts
│       │       └── widgets/route.ts
│       └── src/
│           ├── auth/
│           │   ├── get-session.ts
│           │   └── require-user.ts
│           ├── db/
│           │   ├── pool.ts
│           │   └── with-current-user.ts
│           ├── services/
│           │   ├── contracts.service.ts
│           │   └── clients.service.ts
│           └── permissions/
│               └── contract-permissions.ts
├── packages/
│   └── shared/
└── apps/
    └── be/   # fallback BE 또는 PoC 자산 보관. 1차 구조에서는 필수 런타임 아님.
```

`apps/be`는 당장 삭제하지 않는다. P2에서 검증한 DB/RLS 자산이 있으므로, `apps/web`으로 이식하거나 fallback BE에서 재사용한다.

---

## 5. PoC 게이트

### 5.1 로컬 게이트

- [x] `apps/web` Next.js App Router 생성
- [x] `/api/health` 200
- [x] `/api/db-ping`에서 ClickHouse-managed Postgres 접속
- [x] `/api/widgets`에서 `withCurrentUser` + RLS 조회
- [x] DB 접속 정보는 서버 전용 환경변수로만 사용
- [x] `NEXT_PUBLIC_*`에 DB/secret 값 금지

### 5.2 Amplify 게이트

- [x] Amplify SSR 배포 성공
- [x] 배포된 `/api/health` 200
- [x] 배포된 `/api/db-ping`에서 ClickHouse-managed Postgres 접속 성공
- [x] 배포된 `/api/widgets`에서 `withCurrentUser` + RLS 조회 성공
- [x] ClickHouse-managed Postgres allowlist/network 정책 충족
- [x] secret 관리 방식 확정

### 5.3 Auth 게이트

- 단기 PoC: mock user 또는 임시 Bearer token으로 `profiles.id` 주입
- 정식: Cognito JWT 검증 → `cognito_sub` 또는 email → `profiles.id` 매핑
- 행 단위 권한은 FE에서 재구현하지 않고 API 응답의 `canEdit/canManage` 같은 플래그로 노출

---

## 6. Amplify 검증 시 주의점

- Amplify는 Next.js SSR을 지원하지만, DB 연결형 API 서버로 쓰는 것은 우리 구조에서 별도 검증이 필요하다.
- ClickHouse-managed Postgres가 IP allowlist를 요구하면 Amplify SSR의 outbound 경로가 관문이 된다.
- AWS 문서상 SSR 환경변수에 secret을 단순 주입하는 방식은 주의가 필요하다. DB password는 Secrets Manager/Parameter Store 연계를 우선 검토한다.
- 장시간 작업, batch, migration 실행, CDC 운영 작업은 Next.js route handler에 넣지 않는다. 별도 job/운영 스크립트로 분리한다.

참고:
- https://docs.aws.amazon.com/amplify/latest/userguide/server-side-rendering-amplify.html
- https://docs.aws.amazon.com/amplify/latest/userguide/ssr-supported-features.html
- https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html

---

## 7. fallback 결정 기준

다음 중 하나라도 해결이 어렵다면 별도 BE로 전환한다.

- Amplify SSR에서 ClickHouse-managed Postgres 접속 불가
- IP allowlist / private network 구성이 Amplify SSR과 맞지 않음
- secret 관리가 운영 기준을 만족하지 못함
- API 처리 시간이 Next.js/Amplify SSR 제약과 맞지 않음
- 운영 로그/배포/장애 대응상 API 서버를 분리하는 편이 명확함

fallback은 **EC2 단일 + Docker Compose + Express/Fastify**로 시작하고, 안정화 후 ECS/Fargate 또는 ALB+ASG로 승격한다.

---

## 8. P3 이후 연결

- ✅ Amplify Next.js 풀스택 게이트 통과 → `apps/web` 중심으로 P4 스키마+RLS 이전, P5 Auth, P7 도메인 API 구현
- 게이트 실패 → `apps/be`를 정식 BE로 승격하고 Amplify는 FE 호스팅만 담당
- 어떤 경로든 핵심은 동일하다: **권한 판단은 DB/서버 단일 출처**, FE는 결과를 표시한다.

---

## 9. 실행 결과 — 2026-06-30

### 9.1 배포/런타임

| 항목 | 결과 |
|---|---|
| 새 레포 | `~/nxt-crm` |
| 배포 | AWS Amplify Hosting SSR |
| 배포 URL | `https://main.d1tvtuc4dsin9x.amplifyapp.com/` |
| Amplify app id | `d1tvtuc4dsin9x` |
| Next.js 런타임 | `apps/web` |
| 운영 미러 DB | `nxt_crm` — Supabase logical replication 대상, PoC/개발 write 금지 |
| 개발 DB | `nxt_crm_dev` — P3/P4/P5 개발 대상 |
| 앱 DB role | `nxt_crm_app` — 비-owner 앱용 role |

### 9.2 API 검증

| API | 기대 | 결과 |
|---|---|---|
| `/api/health` | 앱 라우팅 + env target 확인 | ✅ 200, `databaseTarget=nxt_crm_dev` |
| `/api/db-ping` | Amplify SSR에서 DB 접속 | ✅ 200, `database=nxt_crm_dev`, `user=nxt_crm_app` |
| `/api/widgets` | 기본 dev user A로 RLS 조회 | ✅ 200, A팀 행만 반환 |
| `/api/widgets` + `x-dev-user-id` B | 다른 사용자 신원 주입 | ✅ 200, B팀 행만 반환 |

### 9.3 확정/잔여

- **확정**: Amplify SSR route handler에서 `pg` TCP 연결, TLS CA 검증, `withCurrentUser()` 트랜잭션 세션주입, RLS 조회가 동작한다.
- **확정**: P4 이후 개발 대상 DB는 `nxt_crm_dev`다. `nxt_crm`은 Supabase 미러 DB이므로 schema apply/reset/seed/test write 금지.
- **확정**: P3 기준으로 별도 EC2 BE는 1차 경로가 아니라 fallback이다. `apps/be` 자산은 fallback 또는 공통 DB 코드 참고용으로 남긴다.
- **잔여**: 현재 Auth는 dev header/mock user다. Cognito JWT 검증과 `cognito_sub -> profiles.id` 매핑은 P5에서 처리한다.
- **잔여**: 현재 검증 테이블은 smoke용 `p3_poc.widgets`다. 실제 CRM 테이블/RLS 이전은 P4에서 `public` schema 기준으로 진행한다.

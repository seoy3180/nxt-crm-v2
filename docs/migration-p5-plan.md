# P5 실행 계획 — Cognito 인증 + 세션주입 전환

> `migration-plan.md` P5 실행 계획. 작성 2026-06-30.
> 전제: P4 완료. `nxt_crm_dev`에 실제 CRM schema/RLS 적용 완료, Amplify SSR smoke 통과.
> 대상 앱: `~/nxt-crm/apps/web`.
> 대상 DB: **ClickHouse-managed Postgres `nxt_crm_dev` only**.
>
> **중요**: P5는 `x-dev-user-id`/`DEV_USER_ID` 기반 PoC 인증을 실제 Cognito JWT 기반 인증으로 교체하는 단계다. `nxt_crm` 미러 DB는 수정하지 않는다.

---

## 1. P5 목표

P4까지는 임시 dev header로 `profiles.id`를 직접 주입했다. P5의 목표는 사용자가 Cognito로 로그인하면 서버가 JWT를 검증하고, Cognito 사용자(`sub`)를 CRM 사용자(`profiles.id`)로 매핑한 뒤, 기존 `withCurrentUser()` 경로로 RLS 세션값을 주입하게 만드는 것이다.

검증 명제:

> Cognito access token을 검증해 얻은 `sub`를 `profiles.cognito_sub`로 매핑하고, 매핑된 `profiles.id`를 `SET LOCAL app.current_user_id`에 주입해도 실제 CRM 테이블에서 RLS가 fail-closed로 동작한다.

---

## 2. 범위

### 2.1 포함

| 영역 | 처리 |
|---|---|
| Cognito User Pool | dev용 User Pool/App Client/Hosted UI 설정 |
| Auth flow | Authorization Code + PKCE 우선. Implicit grant 금지 |
| JWT 검증 | access token 서명/JWKS/`iss`/`exp`/`token_use`/`client_id` 검증 |
| DB 매핑 | `profiles.cognito_sub` 추가 + unique index + dev 사용자 매핑 |
| 서버 인증 헬퍼 | `requireAuthenticatedProfile()` 계열 구현 |
| RLS 연결 | Cognito `sub` → `profiles.id` → `withCurrentUser()` |
| Smoke API | `/api/auth/me`, 기존 CRM smoke API의 dev header 제거 버전 |
| Amplify env | Cognito/쿠키 관련 환경변수 추가 |

### 2.2 제외

- 전체 CRM 화면 로그인 UX 완성
- 운영 사용자 전체 Cognito 일괄 생성
- 가입/초대 시 `profiles` 생성 함수 구현. P5는 기존 profile과 Cognito `sub` 매핑만 검증하고, 신규 사용자 provisioning은 P5b/P8 이전 별도 게이트로 분리
- 운영 데이터 컷오버
- 권한/role을 Cognito group으로 이관
- 전체 도메인 API 이관(P7)
- FE 화면별 권한 게이팅(P8)
- ClickHouse OLAP/ClickPipe 분석 파이프라인

---

## 3. 핵심 결정

| 항목 | 결정 |
|---|---|
| 인증 주체 | AWS Cognito User Pool |
| 서버 런타임 | Next.js Route Handler on Amplify SSR |
| API 권한 토큰 | Cognito **access token** |
| 사용자 식별자 | Cognito `sub`는 `profiles.cognito_sub`, RLS 세션값은 기존 `profiles.id` |
| CRM role source | Cognito group/JWT claim이 아니라 DB `profiles.role` |
| 브라우저 토큰 저장 | `localStorage` 금지. httpOnly cookie 기반 BFF 흐름 우선 |
| DB role | 계속 `nxt_crm_app`만 사용. admin URL 런타임 금지 |
| RLS | P4 기준 유지: `ENABLE RLS` + 비-owner app role. `FORCE RLS` 미사용 |

### 3.1 왜 `profiles.id`를 그대로 쓰는가

기존 CRM의 이력/관계형 데이터는 `profiles.id`를 기준으로 연결돼 있다.

- `contracts.assigned_to`
- `contract_history.changed_by`
- `deposit_transactions.created_by`
- `deposit_transactions.voided_by`
- `user_preferences.user_id`

따라서 Cognito `sub`로 PK를 바꾸지 않는다. Cognito `sub`는 새 컬럼으로 보관하고, 서버에서 매 요청마다 `sub -> profiles.id`를 해석한다.

### 3.2 `handle_new_user()` 핸드오프

P4에서 Supabase 전용 `handle_new_user()`는 제거했다. 다만 P5에서는 이 함수를 바로 대체하지 않는다.

P5의 책임은 다음으로 제한한다.

- 이미 존재하는 `profiles` row와 Cognito 사용자 `sub`를 연결한다.
- 로그인된 Cognito 사용자가 기존 CRM profile로 해석되는지 확인한다.
- 해석된 `profiles.id`가 RLS 세션값으로 주입되는지 확인한다.

신규 사용자 생성/초대 flow는 별도 작업으로 분리한다.

- 후보 단계: **P5b. 사용자 provisioning** 또는 P8 로그인 UX 착수 전 선행 게이트
- 범위: 관리자 초대, Cognito 사용자 생성, `profiles` 생성, `profiles.cognito_sub` 연결, 초기 role/team 지정, 감사 로그
- 운영 전체 사용자 백필은 P9 컷오버 작업으로 유지

---

## 4. 목표 요청 흐름

```text
Browser
  -> /api/auth/login
  -> Cognito Hosted UI
  -> /api/auth/callback?code=...
  -> 서버가 token endpoint에서 토큰 교환
  -> access token 검증
  -> cognito sub 조회
  -> profiles.cognito_sub = sub 로 profiles.id 확인
  -> httpOnly auth cookie 설정

Browser
  -> /api/crm-smoke/contracts
  -> 서버가 cookie의 access token 검증
  -> sub -> profiles.id 매핑
  -> withCurrentUser(pool, profiles.id, query)
  -> SET LOCAL app.current_user_id = profiles.id
  -> RLS 적용
```

---

## 5. DB 변경 계획

P5 DB migration 후보:

```text
~/nxt-crm/apps/web/db/migrations/
  0005_profiles_cognito_sub.sql
```

내용:

```sql
DO $$
BEGIN
  IF current_database() <> 'nxt_crm_dev' THEN
    RAISE EXCEPTION 'P5 migration must run on nxt_crm_dev, current=%', current_database();
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cognito_sub uuid;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cognito_sub_key
  ON public.profiles (cognito_sub)
  WHERE cognito_sub IS NOT NULL;
```

주의:

- `profiles.id`는 변경하지 않는다.
- `profiles.email`은 이미 unique지만 최종 인증 식별자로 쓰지 않는다. 이메일은 초기 매핑 보조값으로만 사용한다.
- Cognito `sub`는 access token의 `sub` claim이다.
- 타입 기본값은 `uuid`다. Cognito User Pool 로컬 사용자만 쓰는 P5 dev에서는 `sub`가 UUID라 이 타입으로 충분하다.
- 단, 회사 SSO(SAML/OIDC federation)를 P5에서 바로 붙이기로 확정하면 `profiles.cognito_sub`는 `text`로 바꾼다. federated IdP의 사용자 식별자는 provider 설정에 따라 UUID가 아닐 수 있으므로, 장기 SSO 식별자는 `provider + subject` 형태의 별도 text 컬럼/테이블도 검토한다.
- P5 dev에서는 테스트 사용자 1~2명만 수동 매핑한다.
- 운영 전체 백필은 P9 컷오버 작업으로 분리한다.

### 5.1 매핑 원칙

| 상황 | 처리 |
|---|---|
| `profiles.cognito_sub` 존재 | 해당 row의 `profiles.id` 사용 |
| `profiles.cognito_sub` 없음, email 일치 | P5 dev에서는 수동 링크. 운영 자동 링크는 별도 승인 전 금지 |
| Cognito 사용자는 있으나 profiles 없음 | 403 또는 초대/가입 flow로 분기 |
| profiles는 있으나 Cognito 사용자 없음 | 로그인 불가. 초대 생성 필요 |

---

## 6. Cognito 설정 계획

### 6.1 User Pool

개발용 User Pool을 먼저 만든다.

- sign-in alias: email
- required attributes: email
- email verification: enabled
- MFA: dev에서는 optional, 운영 전 required 여부 재결정
- password policy: 조직 기준에 맞춤
- self sign-up: CRM 특성상 기본 disabled 권장. 초대 기반 생성 우선

### 6.2 App Client

- client type: web app
- OAuth grant: Authorization code grant
- PKCE: 사용
- implicit grant: disabled
- callback URL:
  - local: `http://localhost:3000/api/auth/callback`
  - dev deployed: `https://main.d1tvtuc4dsin9x.amplifyapp.com/api/auth/callback`
- sign-out URL:
  - local: `http://localhost:3000/`
  - dev deployed: `https://main.d1tvtuc4dsin9x.amplifyapp.com/`
- scopes:
  - `openid`
  - `email`
  - `profile`

### 6.3 Hosted UI domain

개발용 Cognito hosted domain을 만든다. 커스텀 도메인은 P8/P9에서 필요할 때 재검토한다.

---

## 7. 환경변수

`apps/web/.env.example`에 추가할 후보:

```dotenv
COGNITO_REGION="ap-northeast-2"
COGNITO_USER_POOL_ID="ap-northeast-2_xxxxx"
COGNITO_CLIENT_ID="xxxxx"
COGNITO_ISSUER="https://cognito-idp.ap-northeast-2.amazonaws.com/ap-northeast-2_xxxxx"
COGNITO_DOMAIN="https://xxxxx.auth.ap-northeast-2.amazoncognito.com"
COGNITO_REDIRECT_URI="http://localhost:3000/api/auth/callback"
COGNITO_LOGOUT_REDIRECT_URI="http://localhost:3000/"
AUTH_COOKIE_SECURE="false"
```

Amplify에는 환경별로 같은 값을 설정한다.

- `COGNITO_REDIRECT_URI=https://main.d1tvtuc4dsin9x.amplifyapp.com/api/auth/callback`
- `COGNITO_LOGOUT_REDIRECT_URI=https://main.d1tvtuc4dsin9x.amplifyapp.com/`
- `AUTH_COOKIE_SECURE=true`

주의:

- DB URL은 계속 `nxt_crm_app`용 `DATABASE_URL`만 둔다.
- `DATABASE_ADMIN_URL`은 Amplify runtime env에 넣지 않는다.
- 토큰/쿠키/Authorization header는 로그에 남기지 않는다.

---

## 8. 구현 단계

### P5-0. Console/인프라 준비

1. Cognito User Pool 생성
2. App Client 생성
3. Hosted UI domain 설정
4. callback/logout URL 등록
5. 테스트 사용자 2명 생성
6. 각 테스트 사용자의 Cognito `sub` 확인

게이트:

- Hosted UI 로그인 가능
- authorization code callback 발생
- token endpoint에서 access/id/refresh token 발급 확인

### P5-1. DB migration 적용

`0005_profiles_cognito_sub.sql`을 작성하고 `nxt_crm_dev`에만 적용한다.

게이트:

- `profiles.cognito_sub` 컬럼 존재
- partial unique index 존재
- `nxt_crm` 미러 DB 무변경

### P5-2. Cognito sub 매핑

P4 smoke user 2명에 Cognito sub를 연결한다.

```sql
UPDATE public.profiles
SET cognito_sub = '<cognito-sub-user-a>'::uuid
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE public.profiles
SET cognito_sub = '<cognito-sub-user-b>'::uuid
WHERE id = '22222222-2222-2222-2222-222222222222';
```

게이트:

- Cognito user A → P4 MSP profile
- Cognito user B → P4 EDU profile
- email은 확인용으로만 사용

### P5-3. 서버 JWT 검증 헬퍼

`apps/web`에 인증 헬퍼를 추가한다.

후보 파일:

```text
src/auth/cognito.ts
src/auth/session-cookies.ts
src/auth/require-authenticated-profile.ts
```

검증 기준:

- JWT 형식 검사
- JWKS 서명 검증
- `iss = COGNITO_ISSUER`
- `token_use = access`
- `client_id = COGNITO_CLIENT_ID`
- `exp` 만료 확인
- `sub` 존재 확인

Node 구현은 `aws-jwt-verify` 사용을 우선 검토한다. AWS 공식 문서도 Node.js 앱에서 Cognito JWT 검증에 이 라이브러리를 권장한다.

### P5-4. Auth route 추가

후보 route:

```text
src/app/api/auth/login/route.ts
src/app/api/auth/callback/route.ts
src/app/api/auth/logout/route.ts
src/app/api/auth/me/route.ts
```

역할:

| route | 역할 |
|---|---|
| `/api/auth/login` | state + PKCE 생성, 임시 cookie 저장, Cognito Hosted UI로 redirect |
| `/api/auth/callback` | state 검증, code 교환, JWT 검증, auth cookie 설정 |
| `/api/auth/logout` | auth cookie 삭제, Cognito logout으로 redirect |
| `/api/auth/me` | 현재 로그인 사용자 profile 반환 |

Cookie 원칙:

- httpOnly
- Secure in production
- SameSite=Lax
- Path=/
- access token은 짧게, refresh token은 refresh route에서만 사용
- `localStorage` 사용 금지

### P5-5. `requireDevUserId()` 교체

현재 smoke API는 다음 경로를 사용한다.

```text
requireDevUserId(request)
  -> x-dev-user-id or DEV_USER_ID
  -> withCurrentUser(pool, userId, ...)
```

P5 목표 경로:

```text
requireAuthenticatedProfile(request)
  -> cookie/access token 검증
  -> Cognito sub
  -> SELECT profiles.id WHERE cognito_sub = sub
  -> withCurrentUser(pool, profiles.id, ...)
```

원칙:

- production route에서 `x-dev-user-id`를 신뢰하지 않는다.
- `DEV_USER_ID`는 P5 이후 smoke 전용 fallback으로만 남기거나 제거한다.
- `profiles.role`/`team_id`는 JWT claim이 아니라 DB에서 읽는다.

### P5-6. CSRF/상태변경 API 기준 기록

P5 smoke는 GET 위주지만, cookie 기반 인증을 쓰면 P7의 POST/PUT/DELETE에서 CSRF 기준이 필요하다.

P5에서 최소 결정:

- auth callback은 `state` 필수 검증
- state-changing API는 P7 전에 Origin/Referer 검증 또는 CSRF token 방식을 붙인다.
- SameSite=Lax만으로 mutation 보호를 끝냈다고 보지 않는다.

### P5-7. Amplify 배포 검증

1. Amplify env 추가
2. GitHub push
3. Amplify job 성공 확인
4. 배포 URL에서 login/callback/logout 확인
5. `/api/auth/me` 200 확인
6. `/api/crm-smoke/contracts`가 로그인 사용자별로 분리되는지 확인

추가 확인:

- CloudFront/Amplify SSR 앞단에서 route handler의 `Set-Cookie`가 브라우저까지 전달되는지 확인
- 후속 요청에서 브라우저 `Cookie` 헤더가 route handler까지 전달되는지 확인
- cookie 속성(`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`)이 배포 환경에서 기대대로 설정되는지 확인
- 배포 환경에서 `/api/auth/me`를 새 탭/새로고침 후 다시 호출해도 세션이 유지되는지 확인

---

## 9. 통과 기준

P5 완료 조건:

- [ ] Cognito User Pool/App Client/Hosted UI dev 설정 완료
- [ ] Authorization Code + PKCE 로그인 성공
- [ ] access token JWT 검증 성공
- [ ] invalid/expired token은 401
- [ ] Cognito `sub` → `profiles.id` 매핑 성공
- [ ] 매핑 없는 Cognito 사용자는 403
- [ ] `profiles.cognito_sub` unique index 확인
- [ ] `/api/auth/me`가 DB profile 기준 role/team 반환
- [ ] smoke API에서 `x-dev-user-id` 없이 RLS 동작
- [ ] user A는 `P4-MSP-CONTRACT`만, user B는 `P4-EDU-CONTRACT`만 조회
- [ ] Amplify 배포 환경에서도 로그인+RLS smoke 통과
- [ ] Amplify/CloudFront 경유 후 `Set-Cookie`/`Cookie` 전달 확인
- [ ] Amplify runtime env에 admin DB URL 없음

P5 통과 전에는 P7 도메인 API 이관을 본격화하지 않는다.

---

## 10. 실패 시 대응

| 실패 | 대응 |
|---|---|
| callback mismatch | Cognito App Client callback URL과 Amplify URL 정확히 대조 |
| token exchange 실패 | PKCE verifier cookie/state, redirect_uri, client_id 확인 |
| JWT 검증 실패 | `COGNITO_ISSUER`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, region 확인 |
| `kid` 불일치 | JWKS cache 갱신. Cognito signing key rotation 가능성 확인 |
| `token_use` 불일치 | ID token을 API 권한 토큰으로 쓰고 있는지 확인. API는 access token 우선 |
| profile 매핑 실패 | `profiles.cognito_sub` 백필 여부 확인. email 자동 링크 금지 |
| RLS 0행 | `withCurrentUser()`에 Cognito `sub`가 아니라 `profiles.id`를 넣었는지 확인 |
| Amplify에서만 실패 | env 누락, HTTPS cookie secure 설정, callback URL, CA/DB env 확인 |
| cookie 인증 후 mutation 위험 | P7 전에 CSRF/Origin 검증 추가 |

---

## 11. P5 이후 연결

- P6: 실제 Cognito 로그인 사용자 기준 RLS SELECT/UPDATE/DELETE 자동검증
- P7: clients/contracts/deposit/education 도메인 API 이관
- P8: 로그인 화면/레이아웃/권한 게이팅 포함 FE 이식
- P9: 운영 사용자 Cognito 생성 + `cognito_sub` 백필 + 컷오버

---

## 12. 참고 공식 문서

- AWS Cognito JWT 검증: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
- AWS Cognito access token claims: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- AWS Cognito authorization endpoint / code grant / PKCE: https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html

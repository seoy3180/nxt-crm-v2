# P3 실행 계획 — 인프라 PoC + 배포·프레임워크 확정

> `migration-plan.md` P3. 작성 2026-06-25. 전제: **P2 게이트 통과**(A안 RLS 확정).
> 방식: 먼저 이 문서로 후보·결정 정리(A) → 배포형태+프레임워크 1차 압축(B, §5) → AWS 환경 준비되면 PoC(§6).

---

## 1. P3 목표

- BE **배포형태** 확정
- 웹 **프레임워크** 확정
- **Auth 전달 방식**(Bearer vs httpOnly cookie) 확정
- **Amplify FE ↔ BE ↔ ClickHouse-managed Postgres 연결 경로** 확정

---

## 2. P2에서 이미 검증된 것 (P3에서 재검증 불필요)

- public endpoint + **TLS(CA 검증)** 접속 ✅
- **PgBouncer 6432 transaction-mode** + `SET LOCAL` ✅
- RLS / FORCE / 비특권 롤 ✅
- `withCurrentUser` tx wrapper (`apps/be`) ✅

→ P3는 이 위에 **배포·운영 연결·Auth·CORS**만 얹는다. 네트워크·풀러는 "운영 관점 보강"만(allowlist/VPC, 풀 설정).

---

## 3. P3에서 새로 결정할 것

- **✅ 배포형태: EC2 단일 MVP → 승격** (App Runner·Lambda 제외 — §4·§5)
- **✅ 프레임워크: Express** (§5)
- **✅ Auth 전달: Bearer access token** (도메인 미확보 → cross-site 불가피; 쿠키는 `SameSite=None`이라 CSRF 취약·복잡 → Bearer가 단순+CSRF 무관). **XSS 완화**: 메모리 보관(localStorage 금지)·짧은 만료·Cognito refresh·FE CSP
- **✅ CORS**: Origin 특정(와일드카드 금지) + `Authorization`·`Content-Type` 헤더 허용 (쿠키 미사용 → credentials 불필요)
- **승격 경로**: 같은 상위 도메인 확보 시 httpOnly 쿠키로 전환 가능 — 인증 코어(Cognito 검증→profiles.id→withCurrentUser) 동일, **BE 토큰추출 미들웨어 1곳만 교체**
- 네트워크: IP allowlist(BE IP) / VPC 필요성
- **✅ HTTPS (도메인 없이)**: **CloudFront 기본 도메인(`*.cloudfront.net`) → EC2 HTTP origin** (AWS 관리 TLS, 도메인 구매 불필요). API GW 대신 CloudFront 채택(origin 지정 단순·동적 API는 캐싱 off). ALB+ACM은 도메인 필요라 제외. Bearer 토큰 평문 노출 방지

---

## 4. 배포 후보 비교

> 프레임워크는 **Express 공통**(§5). 아래는 배포형태 비교.

| 후보 | 장점 | 단점 | pg 연결 |
|---|---|---|---|
| **EC2 단일** ✅ 채택 | 가장 빠름·비용 예측 쉬움·pg Pool 자연 | ⚠️ **SPOF(전체 중단)**·운영 직접(HTTPS·배포·패치·로그) | 상시 Pool → 6432 pooler |
| **ECS·Fargate+ALB** (승격 후보) | 컨테이너 표준·무중단 배포·고가용 | 셋업 무거움·비용↑ | 상시 Pool → 6432 pooler |
| **Lambda+API GW** (미채택) | 서버리스·운영 최소 | cold start·**커넥션 관리 까다로움**(pooler 필수) | 6432 pooler 필수 (P2서 검증됨) |

**App Runner 제외 사유**: AWS 문서 기준(2026-06) App Runner는 **신규 고객에게 닫힘**(기존 고객만 계속 사용). 우리 계정이 기존 App Runner 사용자라는 확인이 없으면 후보에서 제외. [Medium — 결정 시 재확인]

**Lambda 런타임 주의**: 현재 **nodejs22.x / nodejs24.x** 지원, **nodejs26은 2026-11 목표**(아직 미지원). 배포 타깃은 **22/24 기준** — 로컬 Node 26에 맞추지 말 것(monorepo `engines.node`를 `>=22`로 둔 이유). [Medium — AWS Lambda runtimes 문서, 결정 시 재확인]

---

## 5. 결정 (B) — ✅ EC2 단일 MVP → 승격

- **✅ 확정(2026-06-25)**: **EC2 단일 인스턴스 + Express + Docker Compose** (빠른 이전 우선; 승격 시 ECS/Fargate로 **이미지 재사용** 위해 Docker로 고정)
- **승격 경로**(운영 안정화 시): **EC2+ALB+ASG** 또는 **ECS·Fargate+ALB**로 다중화
- **프레임워크 Express** 근거: 팀 익숙도·생태계 최다로 **빠른 완성** 우선. `withCurrentUser`는 Express 미들웨어로 감싼다(JWT→cognito_sub→profiles.id→`withCurrentUser`)

**근거**: CRM BE는 Postgres 연결이 핵심 → 상시 실행(EC2)이 Lambda 커넥션 이슈 회피 + pg Pool 자연. P2에서 PgBouncer(6432) 검증됨.

> ⚠️ **EC2 단일 = SPOF** (단일 장애점): 그 한 대 장애 = CRM API 전체 중단. **빠른 이전 위해 MVP로 수용**하되, **운영 안정화 시 다중화(ALB+ASG/Fargate)는 필수**다 — 이건 미루는 것이지 안 하는 게 아니다. 전제: 사내 CRM, 짧은 중단 감내 가능.

---

## 6. PoC 게이트 (AWS 환경 준비 후)

- `/health` 200 응답
- `/me` 또는 `/widgets` — **`withCurrentUser`로 RLS 조회**(P2 자산 재사용)
- **JWT 검증** (Cognito access token 또는 mock)
- **Amplify origin에서 CORS 성공** (FE↔BE 크로스도메인)
- ClickHouse-managed Postgres **6432 pooler 연결** (IP allowlist에 BE IP 등록)
- **토큰 저장/복구 결정**: access=**메모리**(localStorage 금지) / **refresh 저장 위치**(도메인 없어 httpOnly 쿠키 불가 → ⓐ Amplify Auth(amazon-cognito-identity-js)가 관리 ⓑ localStorage+CSP ⓒ 메모리만→새로고침 시 재로그인) / **새로고침 후 세션 복구** 방식 — 셋 중 택1 (보안 vs 편의)

---

## 7. 단일 EC2 선택 시 운영 체크리스트

- **HTTPS**: **CloudFront 기본 도메인 → EC2 HTTP origin** (§3; 도메인 없어 ALB+ACM/Let's Encrypt 불가)
- **배포**: `git pull` 금지 → **Docker image** 배포 (Docker Compose)
- **프로세스**: **Docker restart policy** (Docker Compose 고정 — 승격 시 ECS/Fargate 이미지 재사용)
- **로그**: CloudWatch Agent 또는 최소 파일 로테이션
- **보안**: SSH 직접 접속 최소화 → **SSM Session Manager**
- **DB 접근**: ClickHouse-managed IP allowlist에 **EC2 Elastic IP** 등록
- **Secret**: `.env` 수동 배치 금지 → **SSM Parameter Store / Secrets Manager**
- **SPOF**: 단일 EC2 장애 시 CRM 전체 중단 → 수용 여부·다중화 시점 결정

---

## 8. P3 이후 연결

- 배포·프레임워크 확정 → **P4 스키마+RLS 이전**(`schema.sql` → `nxt_crm`, `auth.uid→current_user_id` 치환 §3.4) + P5 Cognito 통합
- Auth 전달·CORS 확정 → P8 FE 연동

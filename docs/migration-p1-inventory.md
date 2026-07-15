# P1 인벤토리 — Supabase 데이터 접근 전수조사

> 마이그레이션 계획(`migration-plan.md`) **P1(결정 + 전수조사)**의 전수조사 산출물.
> 기준: `schema.sql` 재추출 정본(P0 완료) + `src` 코드. 작성 2026-06-25.
> 게이트: **체크리스트**(⛔ 아님). 목적 = "이관 작업량 지도" — 무엇이 단순 치환이고 무엇이 재설계 대상인지 전수 분류.

---

## 1. 개요

Supabase(PostgREST + `supabase-js` + RLS) → **자체 BE REST API + RLS 유지**로 옮길 때의 영향 범위를 파일·호출·정책 단위로 확정한다. 핵심 질문 셋:

1. `supabase-js` 호출 중 **단순 REST 치환** vs **전용 엔드포인트 재설계** 비율은?
2. `rpc()` 7개를 BE 트랜잭션으로 1:1 재현할 때 가드는?
3. RLS의 `auth.uid()`를 `current_user_id()`로 치환해도 안전한가?

---

## 2. supabase-js 데이터 접근 인벤토리

### 2.1 패턴 정의

| 태그 | 의미 | 이관 난이도 |
|---|---|---|
| **SIMPLE** | 단순 select/insert/update/delete (eq·order·limit·single) | 낮음 — REST 1:1 |
| **EMBED** | 중첩·임베디드 select (`select('*, teams(name)')`, `!inner`) | 중 — JOIN 또는 별도 쿼리 |
| **COUNT** | `{ count:'exact', head:true }` 페이지네이션 | 중 — count 엔드포인트 분리 |
| **SEARCH** | `.or()`·`.ilike`·trigram 다중필드 검색 | 높음 — 검색 로직 BE 이동 |
| **ARRAY** | 배열 연산자 `.contains`/`.overlaps` | 중 — SQL 배열 조건 |
| **OPTIMISTIC** | 조건부 update + rowCount/낙관적 락 (`.is('voided_at',null)`) | 높음 — 동시성 제어 BE |
| **RPC** | `.rpc()` 트랜잭션 함수 | 높음 — BE 트랜잭션 재현 |

### 2.2 파일별 인벤토리

| 파일 | 테이블 / RPC | 패턴 |
|---|---|---|
| `lib/services/client-service.ts` | client_list_view | COUNT·SEARCH |
| | clients (단건·생성·수정) | SIMPLE |
| | clients (부모 검색) | SEARCH |
| | `generate_client_id` / `soft_delete_client` | RPC |
| | contacts (목록·생성·수정·삭제) | SIMPLE |
| | profiles (담당자 목록) | SIMPLE |
| `lib/services/contract-service.ts` | contracts (목록) | EMBED·COUNT |
| | contracts+clients+contract_msp_details (검색) | SEARCH |
| | contracts (단건 상세) | EMBED |
| | `create_contract_with_details` / `replace_contract_tech_leads` / `change_contract_stage` / `soft_delete_contract` | RPC |
| | contracts / contract_msp_details (수정) | SIMPLE |
| | contract_history (조회·기록·삭제) | EMBED·SIMPLE |
| | deposit_accounts (활성 계좌 차단 로직) | EMBED·OPTIMISTIC |
| | education_operations / education_operation_dates | SIMPLE |
| `lib/services/deposit-service.ts` | deposit_accounts (목록·미설정·단건) | EMBED |
| | deposit_transactions (목록·등록) | SIMPLE |
| | deposit_transactions (무효화) | OPTIMISTIC |
| `hooks/use-current-user.ts` | profiles (+teams) | EMBED |
| `hooks/use-dashboard.ts` | clients·contracts (집계) | COUNT·SIMPLE |
| | contract_teams·contract_history | EMBED |
| `hooks/use-employees.ts` | employees | SIMPLE |
| `hooks/use-msp-dashboard.ts` | clients (business_types) | COUNT·ARRAY |
| | contracts·contract_msp_details·contract_history | COUNT·EMBED |
| `hooks/use-revenue.ts` | contracts (월별) | SIMPLE |
| | contract_teams (팀별·기간·배분계산) | EMBED |
| `hooks/use-user-preferences.ts` | user_preferences (조회·upsert) | SIMPLE |
| `components/common/global-search.tsx` | clients·contracts | SEARCH |
| | contacts (+고객) | EMBED·SEARCH |
| | contract_msp_details (AWS 계정) | EMBED·ARRAY |
| `components/contracts/revenue-split-card.tsx` | teams | SIMPLE |
| | contract_teams | EMBED |
| | `update_contract_teams` | RPC |
| `components/clients/related-contracts.tsx` | contracts (고객+자식) | EMBED |
| `components/clients/client-form.tsx` | client_msp_details / client_edu_details (생성) | SIMPLE |
| `components/clients/msp-info-tab.tsx` | client_msp_details (조회·upsert) / contracts (집계 조회) | SIMPLE |
| `lib/contracts/table-save.ts` | contracts / contract_msp_details (인라인 배치) | SIMPLE |
| `app/(authenticated)/msp/clients/page.tsx` | clients (+상세·검색) | EMBED·ARRAY·SEARCH |
| `app/(authenticated)/msp/contacts/page.tsx` | clients·contacts | ARRAY·EMBED·SEARCH |
| `app/(authenticated)/msp/contracts/page.tsx` | contracts | EMBED·COUNT |
| `app/(authenticated)/(nxt)/contracts/page.tsx` | contracts | EMBED·COUNT |

> **카운트 기준 주의**: 본 표는 `.from('table')`/`.rpc('fn')`로 **데이터에 접근하는 파일 19개** 기준이다. `migration-plan.md §6`의 "직접 import 4 + 래핑 경유 27"은 import 기준 카운트로 단위가 다르다(모순 아님). `profile/page.tsx`(auth 전용 — `signInWithPassword`/`updateUser`만), `msp/page.tsx`·`deposit/loading.tsx`(프레젠테이션/스켈레톤 — 데이터접근 0)는 제외했다.

### 2.3 패턴 분포 (파일 19개 기준)

| 구분 | 파일 수 | 파일 |
|---|---|---|
| 순수 SIMPLE (REST 1:1) | 5 | use-employees · use-user-preferences · table-save · client-form · msp-info-tab |
| 재설계 패턴 포함 (EMBED·COUNT·SEARCH·ARRAY·OPTIMISTIC·RPC 중 ≥1) | 14 | 나머지 |

- **distinct RPC: 7개** (정확) — §3
- 재설계 패턴 보유 파일 ≈ **74% (14/19)**

> 호출 단위 정밀 카운트는 산정하지 않는다(파일 기준만 신뢰). 작업량 가늠은 §2.4 부담 큰 호출 + §3 RPC로.

### 2.4 재설계 부담 큰 호출 (P7 우선순위)

1. **계약 목록 + 다중테이블 검색** (`contract-service.ts`) — EMBED+COUNT+SEARCH. 계약명·고객명·AWS account 병렬 검색 후 ID 수합 → IN 필터. 전용 검색 엔드포인트 필요.
2. **글로벌 검색** (`global-search.tsx`) — 4개 테이블 병렬(SEARCH+EMBED+ARRAY). 통합 검색 엔드포인트 설계.
3. **예치금 계좌 메트릭** (`deposit-service.ts`) — 계좌+거래 IN 쿼리 후 클라이언트에서 `avgMonthlyUsage`·`daysUntilDepleted`·`alertLevel` 계산. 계산 로직 BE 이동.
4. **팀별 매출** (`use-revenue.ts`) — contract_teams←contracts 조인 + 기간·배분 계산. SQL JOIN+집계로 이전.
5. **RPC 트랜잭션 7개** (아래 §3).

---

## 3. RPC 7개 → BE 트랜잭션 재현 매핑

7개 중 **6개가 `SECURITY DEFINER`**(→ RLS 우회), `generate_client_id`만 `SECURITY INVOKER`(단순 발번이라 RLS 미우회). BE 재현 시 **진입 가드를 1:1 동등 재현**하고 신원값은 BE가 세션에서 주입(FE 입력 신뢰 금지).

| RPC | 호출처 | 진입 가드 | 재현 주의 |
|---|---|---|---|
| `generate_client_id` | client-service:111 | 없음 (단순 발번) | `MAX+1` 동시성 → advisory lock/SEQUENCE (계획 §3.4) |
| `soft_delete_client` | client-service:156 | `can_access_client` | 연관 3테이블 deleted_at 일괄 |
| `create_contract_with_details` | contract-service:232 | `can_access_client` | 계약+msp_details+business_types 원자 |
| `replace_contract_tech_leads` | contract-service:302 | `can_access_contract` | DELETE+INSERT 원자 |
| `change_contract_stage` | contract-service:311 | `can_access_contract` | `p_user_id` 제거 → 세션 신원 주입 |
| `soft_delete_contract` | contract-service:388 | `can_access_contract` | 관련 테이블 일괄 + 트리거 안전망 |
| `update_contract_teams` | revenue-split-card:95 | `can_access_contract` | P0에서 가드 추가 완료 |

---

## 4. RLS / `auth.uid()` 치환 검증

`auth.uid()` 등장 **16곳** (schema.sql 재추출본, §6 실측과 일치). 치환 대상 분류:

| 형태 | 컬럼/조건 | 타입 | `current_user_id()` 치환 |
|---|---|---|---|
| `col = auth.uid()` | `id`(profiles·함수), `user_id`(user_preferences ×3), `created_by`(deposit_txn_update) | 전부 uuid | `col = current_user_id()` — 타입 일치 ✓ |
| `auth.uid() IS NOT NULL` | clients SELECT, contracts INSERT, education_operation_dates(C/U/D), instructors(I/U), profiles INSERT, team_business_domains SELECT | — | `current_user_id() IS NOT NULL` — NULL→deny 의미 보존 ✓ |

**결론: 전수 치환 안전** [High]. `current_user_id()`는 `NULLIF(current_setting('app.current_user_id', true),'')::uuid`로 uuid 반환 + 미설정 시 NULL→deny(fail-closed). 비교 컬럼이 모두 uuid라 타입 깨짐 없음.

> 치환 규칙은 `migration-plan.md §3.1 (A)` 참조. P6에서 팀A 토큰으로 팀B 차단 + 미주입 deny를 실증 검증한다.

---

## 5. 보안 결함 점검 (§7 연계)

| 항목 | 현황 |
|---|---|
| SECURITY DEFINER RPC 가드 | 6/7 가드 보유 확인(§3). 직접 호출 RPC 중 `generate_client_id`만 무가드·비-DEFINER(단순 발번). `generate_msp/edu_contract_id`는 `create_contract_with_details` 내부 호출이라 FE 직접 노출 없음 |
| `update_contract_teams` 무가드 | **P0에서 가드+search_path 추가·검증 완료** |
| `search_path` 고정 | RPC 전반 `public`(또는 `public,pg_temp`). **전 SECURITY DEFINER 함수 `pg_temp` 일괄 하드닝은 백로그** |
| 비-RPC 직접 변이 (`.from().update().eq('id')`) | RLS가 유일 방어 → **P6 격리검증에서 UPDATE/DELETE까지 실증** |
| 신원값 FE 입력 | `change_contract_stage.p_user_id`·`contract_history.changed_by`·`deposit_transactions.created_by`/`voided_by` → BE 세션 주입으로 전환 (P7) |

---

## 5.5 Auth 이관 인벤토리 (Supabase Auth → Cognito, P5 대상)

데이터접근(§2)과 **별개 트랙**이다. Supabase Auth(GoTrue) 사용처 — P5에서 Cognito로 이관한다.

| 파일 | Auth API | 이관 시 |
|---|---|---|
| `providers/auth-provider.tsx` | `onAuthStateChange`·`signInWithPassword`·`signOut` | Cognito 세션 이벤트·로그인·로그아웃 |
| `lib/supabase/middleware.ts` | `updateSession` → `auth.getUser()`, 쿠키 세션 갱신·보호 라우팅 | Cognito JWT 검증 + `SET LOCAL` 신원 주입 미들웨어 (§3.1·§3.2) |
| `app/(authenticated)/profile/page.tsx` | 재로그인(`signInWithPassword`) 후 `updateUser({ password })` | Cognito 비밀번호 변경 플로우 |
| `hooks/use-current-user.ts` | auth user id로 `profiles`(+teams) 조회 | `cognito_sub → profiles.id` 매핑 후 조회 (§2.2에도 등장 — 조회는 데이터, id 출처는 Auth) |
| `lib/services/deposit-service.ts` | `auth.getUser()` ×2로 `created_by`(거래 등록)·`voided_by`(무효화) 세팅 | BE가 세션 사용자로 주입 (§3.3 신원 BE 주입) |

---

## 6. 트랙 B로 넘기는 결정 항목

P1에서 정할 수 있는 것 vs PoC 의존:

- **지금 결정 가능**
  - #7 i18n 필요 여부 (현재 한국어 전용으로 보임)
  - #1 BE 스택 *방향* (Node/SAM vs Python/FastAPI — 운영 선호; 확정은 P2·P3 PoC)
- **PoC/preview 의존 → P2·P3 이월**
  - #2 ClickHouse-managed Postgres preview 실동작(RLS/FORCE/풀러)
  - #3 컷오버 다운타임 / #4 BE 배포형태 / #5 CORS·Auth 전달 / #6 네트워크 경로 / #8 분석 모델

---

## P1 체크리스트 (게이트)

- [x] supabase-js 사용처 패턴 분류 (19파일 / 7패턴)
- [x] rpc 7개 위치·가드 매핑
- [x] auth.uid() 16곳 → current_user_id() 치환 안전성 검증
- [x] 보안 결함 목록 (§7 연계, P6 이월 명시)
- [x] Auth 사용처 인벤토리 (Supabase Auth→Cognito, P5 대상) — §5.5
- [ ] 트랙 B 결정 (#1·#7) — 별도 진행

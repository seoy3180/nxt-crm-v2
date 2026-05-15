# 인수인계 — 예치금 대시보드 개발

> 작성: 2026-05-15 (Phase 2.5 진행 중 한글 깨짐으로 임시 인수인계)
> 다음 세션에서 이 문서를 읽고 이어서 진행하세요.

---

## 1. 한 줄 컨텍스트

NXT CRM v2에 **예치금(Deposit) 대시보드** 기능을 정석 프로세스(CLAUDE.md Phase 0~8)로 개발 중. **Phase 2.5 (pre-mortem) Q4 답변 단계**에서 멈춤.

---

## 2. 진행 상태

| Phase | 상태 | 산출물 |
|---|---|---|
| Phase 1: PRD 작성 | ✅ 완료 | `docs/prd/deposit-dashboard.md` |
| Phase 2: spec-review | ✅ 완료 | 위 PRD에 11개 결정사항 반영 |
| **Phase 2.5: pre-mortem** | 🔄 **Q4 답변 대기** | 미반영 |
| Phase 3: UI 설계 (Pencil) | ⏳ 대기 | - |
| Phase 4: 구현 계획 | ⏳ 대기 | - |
| Phase 4.5: 테스트 계획 | ⏳ 대기 | - |
| Phase 5: Foundation (마이그레이션 + 시딩) | ⏳ 대기 | - |
| Phase 6: 구현 | ⏳ 대기 | - |
| Phase 7: 검증 루프 | ⏳ 대기 | - |
| Phase 8: 기록 | ⏳ 대기 | - |

---

## 3. 핵심 결정사항 (이미 PRD에 반영됨)

### 비즈니스 결정 (5개)
1. **차감 데이터 출처**: 수기 입력 → AWS API 자동 연동(확장)
2. **적용 범위**: MSP 계약만
3. **CRM 내 위치**: 사이드바 "예치금" 메뉴 + 계약 상세 "예치금" 탭
4. **통화 처리**: 옵션 C (KPI 통화별 두 줄, 카드는 통화 무관 한 그리드, 환산 합산 X)
5. **Slack 알림**: MVP 제외, 향후 확장

### DB 스키마 결정 (Q1~Q8)
| Q | 결정 |
|---|---|
| Q1 | 별도 테이블 분리 (`deposit_accounts` + `deposit_transactions`) |
| Q2 | 1:1 UNIQUE (`contract_id` UNIQUE) |
| Q3 | txn_type 4종 (`deposit / usage / adjustment / refund`), **adjustment만 음수 amount 허용** (옵션 E) |
| Q4 | 임계값 알림 MVP 제외 (alert_threshold_pct 컬럼 없음) |
| Q5 | DB 트리거로 캐시 자동 갱신 |
| Q6 | accounts: `deleted_at` / transactions: `voided_at` + `voided_by` + `void_reason` |
| Q7 | `bigint` (원/달러 정수, 기존 일관) |
| Q8 | 환율 컬럼 없음 |

### spec-review 결정 (11개 — PRD에 모두 반영됨)
1. **1-1**: 트랜잭션 0건일 때만 비활성화 허용
2. **1-2**: `avgMonthlyUsage` = 직전 N개월(min(3, 활성개월수)) 평균
3. **1-기타**: 컬럼명 `business_unit` → `type` 정정, "토글" → "활성화 버튼" 통일
4. **2-1**: `contracts.currency` 자동 상속, 변경 불가 (deposit_accounts에 currency 컬럼 없음)
5. **2-2**: 기존 57건 100% 수동 활성화
6. **2-3**: 사이드바 "예치금" 메뉴 옆 critical 건수 빨간 배지 + 대시보드 진입 시 critical→warning→ok 자동 정렬
7. **3-1**: 트리거 SQL 의사코드 PRD §12에 명시 (타입별 집계 + balance는 4타입 합산)
8. **4-1 (OPEN-1 해소)**: 잔액 != 0이면 계약 soft delete 차단 (BIZ-5) → **refund(FR-9)를 P1 → P0 승격**, 구현 순서 재배치
9. **4-2 (OPEN-2 해소)**: 본인 입력분 시간 제한 없이 void 가능
10. **5-1**: MSP 도메인 한정 + MSP 팀 전체(영업 포함) 가시 — 영업의 "본인 담당만" 제약 제거
11. **5-2**: "충전 영업" 버튼 MVP에서 제거

---

## 4. Phase 2.5 (pre-mortem) 진행 상태

### 식별한 리스크 사전 진단

**Tiger 후보**:
- DB 트리거 함수 안정성 (SECURITY DEFINER + search_path)
- 트리거 성능 (트랜잭션 누적 시 SUM 재계산)
- RLS 정책 (영업 가시 범위 차이)
- 계약 soft delete 차단 트리거 → 기존 contracts UX 충돌
- 사이드바 배지 갱신 (모든 mutation invalidate 필요)

**Paper Tiger 후보**:
- 모달/Form/Table (shadcn 기존 패턴)
- TanStack Query 캐시 (이미 사용 중)
- soft delete 패턴 (다른 테이블에서 검증)

**Elephant 후보**:
- 트리거 함수 테스트 인프라
- 마이그레이션 롤백 시나리오
- 운영 매뉴얼/영업 교육
- 시드 시나리오 가이드 부재

### 인터뷰 결과 (답변 완료)

**Q1: NXT CRM에 이미 동작 중인 DB 트리거 함수가 있나?**
→ **Q1A 확정 (코드 조사 결과)**
- 트리거 14개 운영 중 (9개 테이블 updated_at 자동 갱신)
- SECURITY DEFINER 함수 6개 운영 중 (`00016_create_rls_functions.sql`의 `user_role()`, `user_team_id()`, `is_admin_or_clevel()`, `can_access_contract()` 등)
- `search_path` 명시는 모든 함수에서 누락 → 예치금 트리거에는 명시 권장 (Elephant)
- `c_level` 역할이 admin과 동일 권한 (PRD 권한 매트릭스에 추가 필요)

**Q2: 기존 contracts 페이지의 영업 권한?**
→ **자동 해소 (코드 조사 결과)**
- `can_access_contract` RLS 함수: admin/c_level 전체, 그 외는 본인 team_id 매칭 → **영업도 본인 팀(MSP) 계약 전체 조회 가능**
- 예치금의 "MSP 팀 전체 가시" 결정과 일관, 추가 작업 없음

**Q3: 계약 삭제 시 BIZ-5 차단 에러 표시 방법?**
→ **Q3A**: API 레벨에서 사전 체크 + 안내 모달 + "예치금 탭으로 이동" CTA. DB 트리거는 최종 안전망.

### 남은 질문 (다음 세션 시작 지점)

**Q4: 트리거/잔액 계산 테스트 전략은?**

옵션 (텍스트로만, AskUserQuestion 한글 깨짐 회피):

- **Q4A (추천)**: Playwright E2E + Vitest 단위 테스트
  - Phase 7에서 Playwright로 입출/차감/void 시나리오 → 대시보드 아웃풋 검증
  - `calcBalance()` 유틸을 클라이언트에 명시 → Vitest 단위 테스트
  - 기존 인프라(Vitest + RTL) 활용. 추가 학습 적음.

- **Q4B**: pgTAP 도입 — DB 단위 테스트
  - Supabase 로컬 + pgTAP로 트리거 SQL 레벨 검증
  - 가장 정확하지만 pgTAP 셋업/학습 곡선

- **Q4C**: Phase 4.5 `/test-scenarios`에서 결정 — 지금은 결정 보류

### 현재 테스트 인프라 (조사 결과)

- ✅ Vitest + React Testing Library + happy-dom
- ⏳ Playwright는 Phase 7에서 도입 예정 (PRD에 명시)
- ❌ pgTAP 없음
- ✅ Supabase `seed/` 폴더 (dev-seed.sql, create-test-users.sql 등)

---

## 5. 다음 세션 시작 가이드

### 시작 한 줄

> "예치금 대시보드 Phase 2.5 (pre-mortem) Q4 답변부터 이어서 진행. 이 인수인계 md 읽고 시작해줘: `docs/handoff/deposit-dashboard-20260515.md`"

### Phase 2.5에서 남은 작업

1. **Q4 답변 받기** (A / B / C)
2. **STEP 3 Pre-mortem 결과 PRD에 반영** — `# Part 4. 개발 리스크 분석 (Pre-mortem)` 섹션 추가
   - Tigers 표 (T-1 ~ T-N)
   - Paper Tigers 표 (P-1 ~ P-N)
   - Elephants 표 (E-1 ~ E-N)
   - 부수 발견 사항(search_path 명시, c_level 역할) 처리

### 그 이후 Phase 흐름

- Phase 3: Pencil MCP로 UI 설계 (또는 기존 프로토타입 활용 결정)
- Phase 4: writing-plans 스킬로 구현 계획
- Phase 4.5: test-scenarios로 테스트 계획
- Phase 5: 마이그레이션 + 시딩 (Foundation)
- Phase 6: 구현
- Phase 7: 검증 (reviewer + test + Playwright)
- Phase 8: 기록 (`docs/conversations/`)

### ⚠️ 한글 깨짐 회피

- `AskUserQuestion` 도구가 한글을 `\uXXXX`로 escape 처리 → UI에서 깨져 보일 수 있음
- 대안: **텍스트로 옵션 나열 + 사용자가 "A/B/C" 답하는 방식**

---

## 6. 관련 파일 경로

| 파일 | 역할 |
|---|---|
| `docs/prd/deposit-dashboard.md` | 메인 PRD (Phase 1 + Phase 2 반영 완료) |
| `docs/handoff/deposit-dashboard-20260515.md` | 본 인수인계 문서 |
| `src/app/test-ui-preview/deposit/` | 프로토타입 3종 (인덱스/operation/accounting) |
| `src/app/test-ui-preview/deposit/operation/page.tsx` | A안 운영 관점 메인 프로토타입 (옵션 C 적용 후) |
| `supabase/migrations/00002_create_common_functions.sql` | `update_updated_at()` 트리거 함수 패턴 참고 |
| `supabase/migrations/00016_create_rls_functions.sql` | SECURITY DEFINER RLS helper 패턴 참고 |
| `supabase/migrations/00017_create_rls_policies.sql` | `contracts_select` RLS 정책 참고 |
| `CLAUDE.md` | 프로젝트 프로세스 정의 |
| `MEMORY.md` (사용자) | 과거 RLS/트리거 이슈 메모 |

---

## 7. 부수 발견 사항 (Phase 2.5 인터뷰 중 발견)

다음 항목은 PRD에 별도 반영 필요:

1. **`c_level` 역할**: 권한 매트릭스에 추가 (admin과 동일 권한). 이미 `is_admin_or_clevel()` helper로 구현되어 있음
2. **`search_path` 명시**: 기존 SECURITY DEFINER 함수는 누락. 예치금 트리거에는 `SET search_path = public` 추가 (보안 권장 + MEMORY.md 메모)
3. **RLS 패턴**: `can_access_contract(p_contract_id)` helper를 deposit에도 활용 가능. `deposit_accounts` RLS는 `can_access_contract(contract_id)` 호출로 단순화

---

## 8. 메모

- 사용자가 한 번에 여러 질문 받는 것 부담스러워함. **질문 1~2개씩 진행** 권장
- 기술 용어(트리거, void, soft delete, balance 등) 풀어 설명 후 질문하면 빠르게 이해
- 옵션 비교 시 **숫자/시각 예시**(스타벅스 카드 비유, SQL preview)가 효과적이었음
- 결정 후 즉시 PRD에 반영 → 다음 단계로 이동 (왔다갔다 안 함)

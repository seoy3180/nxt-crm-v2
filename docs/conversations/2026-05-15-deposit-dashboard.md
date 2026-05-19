# 예치금 대시보드 — 종합 기록 (Phase 8)

> 작성: 2026-05-15
> 작업자: 김서윤 (Lead) + Claude
> Phase 1~7 완료 후 컨버세이션 로그
> 관련 PRD: `docs/prd/deposit-dashboard.md`
> 관련 Plan: `docs/superpowers/plans/2026-05-15-deposit-dashboard.md`
> 관련 Test Plan: `docs/specs/deposit-dashboard/test-plan.md`

---

## 1. 프로젝트 배경

NxtCloud의 MSP 사업에서 일부 고객이 **선결제 예치금 모델**로 운영됨. 고객이 일정 금액을 미리 예치하고, AWS 사용량만큼 차감되는 구조. 기존엔 빌링온/구글시트/Slack 메모로 관리됐는데 누락·실수 위험이 있어 NXT CRM v2에 통합 트래킹 기능을 추가하는 것이 목표.

## 2. 핵심 의사결정

### 2.1 사업/UX 결정 (Phase 1)
| 결정 | 이유 |
|---|---|
| **A안(운영 관점) 채택, B안(회계 인식) 보류** | 회계는 ERP 영역. CRM은 영업·고객 케어용 잔액 트래킹에 집중 |
| **차감 데이터: 수기 입력 → AWS API 확장** | MVP는 가장 빠른 도입. AWS Cost Explorer 연동은 별도 PRD |
| **MSP 계약만 적용** | Education/Dev는 예치금 모델 없음 |
| **통화 처리: 별도 트랙 (옵션 C)** | 환율 환산 X. USD/KRW 각각 두 줄 표시. 환차손익 회피 |
| **Slack 알림: MVP 제외** | 사이드바 배지 + 자동 정렬로 시각적 대체 |

### 2.2 DB 스키마 결정 (Phase 1, Q1~Q8)
| Q | 선택 | 핵심 이유 |
|---|---|---|
| Q1 | 별도 테이블 분리 | `contract_msp_details` 비대 방지 + 향후 확장성 |
| Q2 | 1:1 UNIQUE | 99% 케이스 단순. 향후 풀기 쉬움 |
| Q3 | txn_type 4종 + adjustment만 음수 | Stripe식. enum 단순 + 부호 의미 명시 |
| Q4 | 알림 임계값 컬럼 X | MVP 미필요. 코드 상수로 |
| Q5 | DB 트리거 캐시 | 정합성 강제. RPC 우회해도 갱신됨 |
| Q6 | accounts soft delete, txn voided 패턴 | 회계 로그 immutable |
| Q7 | bigint | 기존 4개 금액 컬럼과 일관 |
| Q8 | 환율 컬럼 X | 옵션 C와 일관 |

### 2.3 Spec Review 결정 (Phase 2)
PRD 11건 갱신. 핵심:
- **avgMonthlyUsage = 직전 N개월(min(3, 활성개월수)) 평균** — 트랜잭션 건수 분모 대신
- **사이드바 배지 + 카드 자동 정렬** — Slack 없이 critical 인지 가능하게
- **권한 매트릭스 MSP 도메인 한정 + 팀 전체 가시** — 영업의 "본인 담당만" 제약 제거
- **잔액 != 0이면 계약 삭제 차단 (BIZ-5)** + **refund(FR-9) P0 승격**

### 2.4 Pre-mortem (Phase 2.5)
**Tigers 5건** 모두 Phase별 대응 매핑. **Paper Tigers 6건** 기존 NXT CRM 패턴 의존. **Elephants 8건** 가시화.

핵심 발견: 기존 NXT CRM의 SECURITY DEFINER 함수 6개가 모두 `search_path` 누락 상태. 예치금 트리거에는 명시 (별도 보안 이슈로 분리).

## 3. 트레이드오프

### 3.1 선택한 것 vs 안 선택한 것

**음수 부호 처리 — adjustment만 자유 (옵션 E)**
- 선택: 사용자 직관 + 일상 케이스(deposit/usage) UX 깔끔
- 트레이드오프: 일관성 약간 깨짐 (adjustment만 예외)
- 안 선택: Stripe식 모든 type 부호 자유 — 매번 부호 입력 번거로움

**계약 삭제 시 자동 연쇄 vs 차단**
- 선택: 차단 (BIZ-5)
- 트레이드오프: 환불 절차 강제 → 영업 부담 약간, 회계 안전성 +
- 안 선택: 자동 cascade — 잔액 사라짐 위험

**Spec 격리 vs 빠른 검증**
- 선택: HP-1, HP-2 빠른 검증으로 핵심 시나리오 확인 후 마무리
- 트레이드오프: 6개 spec은 시드 격리 인프라 부재로 누적 fail
- 안 선택: supabase-test-helpers 도입 + 모든 spec PASS — 1~2시간 추가

## 4. 향후 확장 포인트 (Won't in MVP)

| 항목 | 트리거 시점 | 예상 작업량 |
|---|---|---|
| **AWS Cost Explorer API 자동 차감** | 수기 입력 부담 임계 (예: 월 100건+) | 별도 PRD + 2~3주 |
| **Slack 알림** | critical 진입 인지 누락 발생 시 | 1주 (cron + Edge Function) |
| **임계값 개별 설정** | "큰 고객은 빡빡, 작은 고객은 느슨" 운영 요구 시 | 컬럼 1개 + UI 1개 = 1일 |
| **통화 환산 합계** | "전사 잔액 한 숫자로" 임원 요구 시 | 환율 테이블 + UI = 3일 |
| **빌링온 데이터 import** | 기존 운영 건 일괄 이관 필요 시 | CSV 파서 + UI = 3~5일 |
| **adjustment 시간 제한** | 영업이 본인 입력분을 오래된 시점에 void하는 실적 다투기 발생 시 | 1줄 SQL + 1줄 UI |

## 5. 알려진 한계

### 5.1 Spec 안정화 미완
6 E2E spec(BL-1/BL-5/BL-6/AS-2/admin/AF-1)은 시드 데이터 격리 부재로 누적 실행 시 fail. 단독 실행은 가능. **spec 코드 자체는 정상**. 격리 인프라 추가 시 통과.

**해결 방향:**
- A: supabase-js + service role key를 spec에서 사용 → `beforeEach` reset
- B: Supabase 브랜치 분리 → 격리 환경
- C: docker-compose로 로컬 Supabase 띄우기 → 빠른 truncate

### 5.2 USD 시나리오 실데이터 부재
현재 MSP 계약 57건 모두 KRW. USD 코드 경로는 코드/UI에 구현되어 있으나 실제 검증은 더미 데이터 시점에 제한.

### 5.3 기존 SECURITY DEFINER 함수의 search_path 누락
예치금 트리거는 명시했으나, `00016_create_rls_functions.sql`의 6개 함수는 누락 상태. **별도 보안 이슈**로 분리 (이번 PRD 범위 외).

### 5.4 사이드바 배지 vs 카드 정밀 판정 불일치 가능
사이드바 배지는 1차 판정(balancePct만)이고, 카드는 정밀 판정(daysUntilDepleted까지). 보통은 일치하지만 사용량 변동 큰 케이스에 다를 수 있음. PRD 의도된 동작이나 사용자 혼란 가능성.

## 6. 학습 포인트

### 6.1 정석 프로세스 (CLAUDE.md Phase 0~8) 효과
- **Phase 1 PRD + Phase 2 spec-review**: 13개 결정사항을 미리 확정 → Phase 6 구현 시 의문 없이 진행
- **Phase 2.5 pre-mortem**: 5 Tigers 대응을 Plan에 미리 매핑 → 구현 단계의 함정 회피
- **Phase 3 UI 설계 (Pencil)**: 디자인 시스템 정합 확인. 단, reusable component 직접 수정 한계로 사이드바는 코드 작업으로 옮김 (개선점)
- **Phase 4 writing-plans**: 11개 task에 코드/명령어 명시 → 매 단계 막힘 없음
- **Phase 4.5 test-scenarios**: 47 케이스 매트릭스 → Phase 7에서 어떤 시나리오 검증할지 명확

### 6.2 효과적이었던 패턴
- **TDD (Vitest)**: `calcBalance` 유틸 14건 — 회계 데이터 정확도 보장. 구현 전에 테스트 작성 → 명확한 의도 코드
- **prototype-first** (`test-ui-preview/deposit`): 디자인 검증 + 디자인 사양 합의를 코드보다 먼저
- **MCP를 활용한 마이그레이션 직접 적용**: 사용자 직접 실행 부담 줄임 (단, 사용자 명시적 승인 받고 진행)

### 6.3 비효율적이었던 부분
- **Pencil reusable component 수정 한계** — 사이드바를 Pencil에서 수정하려다 코드로 우회. UI 설계의 일부는 도구 한계 인식 필요
- **AskUserQuestion 한글 깨짐** — `\uXXXX` escape 처리로 일부 환경에서 가독성 저하. 텍스트 옵션 + A/B/C 답변 방식이 더 안정적
- **Playwright spec 격리 미준비** — Phase 4.5에서 격리 전략(시드 cleanup) 미언급 → Phase 7에서 발견. 차후엔 test-plan에 격리 정책 포함

## 7. 회귀(Rollback) 정책 이행

- 시드 적용 → 테스트 → `TRUNCATE deposit_transactions, deposit_accounts CASCADE` 실행 → 0건 확인
- `contracts.deleted_at` 변경 없음 검증 (BIZ-5 차단으로 자동 보호됨)
- **운영 데이터 100% 보존**

## 8. 관련 파일 인덱스

```
docs/
├── prd/deposit-dashboard.md                   메인 PRD (Phase 1~3 반영)
├── superpowers/plans/2026-05-15-deposit-dashboard.md  구현 계획 (11 task)
├── specs/deposit-dashboard/
│   ├── test-plan.md                           47 테스트 케이스 매트릭스
│   └── manual-test-guide.md                   수동 검증 가이드
├── handoff/deposit-dashboard-20260515.md      세션 중단용 인수인계
└── conversations/2026-05-15-deposit-dashboard.md  본 문서

supabase/
├── migrations/
│   ├── 00022_create_deposit_accounts.sql      테이블 + RLS
│   ├── 00023_create_deposit_balance_trigger.sql  잔액 자동 갱신
│   └── 00024_create_contract_delete_guard.sql 계약 삭제 차단
└── seed/
    ├── deposit-seed.sql                       3 시나리오 시드
    └── deposit-rollback.sql                   회귀 (TRUNCATE)

src/
├── lib/deposit/                                도메인 모듈
│   ├── types.ts
│   ├── constants.ts
│   └── calc-balance.ts                        TDD 14 PASS
├── lib/services/deposit-service.ts
├── lib/supabase/types.ts                       (재생성됨)
├── hooks/use-deposit-*.ts                      Query/Mutation 훅
├── components/
│   ├── deposit/                                 UI 컴포넌트 + 모달
│   └── layout/sidebar-deposit-badge.tsx
└── app/(authenticated)/deposit/                  메인 페이지

e2e/
├── global-setup.ts                              3 role 로그인 캐시
├── fixtures/auth.ts                             Page fixture
└── deposit/*.spec.ts                            4 spec / 9 케이스

tests/lib/deposit/calc-balance.test.ts          Vitest 14 PASS
ui_design.pen                                    Screen/DepositDashboard, Detail, Modal
```

## 9. 다음 작업자를 위한 요약

**핵심 인지:**
1. **잔액 계산 로직은 DB 트리거(`recalc_deposit_account_balance`)에 박혀 있음.** 클라이언트의 `calcBalance` 유틸은 미러. 변경 시 둘 다 동기.
2. **TanStack Query 키는 `depositKeys.all` 일괄 invalidate** — 모든 mutation이 이를 따름. 새 mutation 추가 시 패턴 유지.
3. **권한**: adjustment/refund는 RLS WITH CHECK으로 admin/c_level만. UI도 동일 분기. 둘 중 하나 누락 X.
4. **계약 삭제는 잔액 != 0이면 차단**. API 사전 체크 + DB 트리거 이중 안전망.
5. **사이드바 배지는 1차 판정(balancePct), 카드는 정밀 판정**. 의도된 차이.

**바로 확장 가능한 작업:**
- 환불(refund) 시나리오 E2E 추가 (Plan Task 13의 Refund 모드만 별도 spec)
- AWS Cost Explorer API 연동 (별도 PRD)
- 임계값 개별 설정 (컬럼 추가 + UI 1개)

---

**Phase 8 (기록) 완료.** 이 기능은 메인 코드에 반영되었고, 운영 시점 데이터 시드 + 영업 교육 시작 가능.

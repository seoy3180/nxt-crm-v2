# 예치금 대시보드 PRD

> NXT CRM v2 — MSP 계약 선결제 예치금 운영 트래킹 (A안 운영 관점)
>
> 작성일: 2026-05-14
> 단계: Phase 1 (PRD)
> 산출물 위치: `/Users/ksy/nxt_crm_v2/docs/prd/deposit-dashboard.md`

---

## 1. 개요

### 목적
MSP 사업 일부 고객이 **선결제 예치금 모델**로 운영된다. 고객이 일정 금액(예: 1,200만원)을 미리 예치하고, 매월 AWS 사용량만큼 예치금에서 차감되며, 잔액이 줄어들면 영업이 추가 충전을 요청하는 구조다.

지금까지는 빌링온/구글시트/Slack 메모로 관리되어 왔다. CRM v2에서 이 흐름을 통합 트래킹하여:
- 영업이 **충전 영업 타이밍**(소진 예측)을 놓치지 않게 한다
- 고객 케어 담당이 **잔액 현황**을 즉시 확인할 수 있게 한다
- 입출 내역에 대한 **단일 진실 공급원(Single Source of Truth)**을 만든다

### 배경
- 동식님과 두 관점을 비교 후 **A안(운영) 채택** 확정
  - A안 (운영): 잔액·소진 트래킹 — 영업/고객 케어용 — **본 PRD 대상**
  - B안 (회계): 매출 인식 스케줄 — 재무용 — ERP 영역, MVP 제외
- 회계 처리는 향후 ERP/회계 시스템 연동 영역으로 미룸
- 현재 MSP 계약 57건 운영 중 (전부 KRW, contract_msp_details 1:1 매칭)

### 대상 사용자
| 역할 | 주요 사용 시나리오 | 빈도 |
|------|-----------------|------|
| 영업 (Sales) | 담당 고객 잔액 확인 → 충전 영업 타이밍 판단 → 예치/차감 등록 | 주 2~3회 |
| 사내 담당자 (CSM/MSP Ops) | 전체 고객 잔액 현황 모니터링 → 사용분 차감 등록 (월 1회 정산) | 월 1~2회 |
| 관리자 (Admin) | 전체 잔액 합계 모니터링 → 권한 관리 → 잘못된 입력 보정(adjustment/void) | 주 1회 |

### 성공 지표
- **운영 지표 (MVP 후 3개월 측정)**
  - 예치금 트래킹 대상 계약 수: 운영 중 선결제 MSP 계약의 80% 이상 등록
  - 충전 영업 리드 타임: 잔액 25% 진입 → 충전 등록까지 평균 14일 이내
  - 데이터 신뢰성: voided 트랜잭션 비율 5% 이하 (= 입력 정확도 95%+)
- **사용성 지표**
  - 대시보드 진입 후 잔액 확인까지 소요 시간 3초 이내 (TTI)
  - 트랜잭션 등록 1건 평균 소요 시간 30초 이내

---

## 2. 기능 요구사항

### 2.1 핵심 기능 (P0 — Must)

#### FR-1: 예치금 계좌 자동 생성
**설명**: MSP 계약 생성 시 또는 계약 상세에서 "예치금 사용" 토글 ON 시, 해당 계약에 1:1로 매핑되는 `deposit_accounts` 레코드를 자동 생성한다.

**수용 기준**:
```
Given: MSP 계약(`contracts.business_unit = 'msp'`)이 존재한다
When: 사용자가 계약 상세 > "예치금" 탭에서 "예치금 계좌 활성화" 버튼을 클릭한다
Then: deposit_accounts에 contract_id = 해당 계약 id로 1건 INSERT된다
Then: balance, total_deposit, total_usage는 모두 0으로 초기화된다
Then: "예치금" 탭에 빈 계좌 화면(Empty State)이 표시된다

Given: 이미 해당 계약에 예치금 계좌가 존재한다
When: 사용자가 다시 활성화를 시도한다
Then: UNIQUE 제약으로 INSERT가 차단되고, 기존 계좌가 그대로 표시된다
Then: 활성화 버튼은 노출되지 않는다
```

---

#### FR-2: 트랜잭션 등록 — 입금(deposit)
**설명**: 사용자가 예치금 입금 내역을 수기로 등록한다.

**수용 기준**:
```
Given: 활성화된 예치금 계좌가 있다
And: 사용자에게 `deposit:write` 권한이 있다 (영업/사내담당/관리자)
When: 사용자가 "+ 예치 등록" 버튼 클릭 → 모달 오픈 → 다음을 입력한다
  - txn_type: deposit (고정, dropdown으로 선택)
  - txn_date: 날짜 (기본값 = 오늘)
  - amount: 양의 정수 (최소 1, 최대 9,999,999,999)
  - memo: 선택 입력 (최대 200자)
And: "등록" 버튼을 클릭한다
Then: deposit_transactions에 INSERT된다 (source='manual', created_by=현재 유저)
Then: 트리거에 의해 deposit_accounts.balance, total_deposit, last_recalc_at이 자동 갱신된다
Then: 모달이 닫히고 토스트 "입금 ₩1,200,000원이 등록되었습니다"가 3초간 표시된다
Then: 카드의 잔액 KPI, 입출 내역, 잔액 추이 차트가 즉시 갱신된다

Given: amount에 0 또는 음수를 입력했다
When: "등록" 버튼을 클릭한다
Then: "입금액은 1원 이상이어야 합니다" 인라인 에러가 표시되고 제출이 차단된다
```

---

#### FR-3: 트랜잭션 등록 — 사용분 차감(usage)
**설명**: 매월 AWS 사용분을 수기로 차감 등록한다. (MVP는 수기 입력만, AWS API 자동 연동은 향후 확장)

**수용 기준**:
```
Given: 활성화된 예치금 계좌가 있다
When: 사용자가 "− 사용분 등록" 버튼 클릭 → 모달 오픈 → 다음을 입력한다
  - txn_type: usage (고정)
  - txn_date: 날짜 (기본값 = 전월 말일)
  - amount: 양의 정수 (UI 표시는 "차감액"으로 양수 입력받음, DB 저장 시 양수 그대로)
  - memo: 권장 입력 (예: "AWS 4월 사용분") — 자유 텍스트, 최대 200자
When: "등록" 버튼을 클릭한다
Then: deposit_transactions에 INSERT된다 (txn_type='usage', amount > 0)
Then: 트리거에 의해 balance = balance - amount, total_usage = total_usage + amount로 갱신된다
Then: 카드 UI가 즉시 갱신된다

Given: 차감 후 잔액이 음수가 된다
When: "등록" 버튼을 클릭한다
Then: 경고 모달 "차감 후 잔액이 ₩-150,000으로 음수가 됩니다. 계속하시겠습니까?" 표시
And: "계속" 선택 시 등록 진행, "취소" 시 모달 유지
Then: 등록 후 카드의 알림 레벨은 자동으로 critical로 표시된다 (balancePct < 0)
```

---

#### FR-4: 실시간 잔액 및 KPI 자동 계산
**설명**: 트랜잭션이 INSERT/UPDATE될 때마다 DB 트리거로 `deposit_accounts`의 캐시 컬럼(balance, total_deposit, total_usage, last_recalc_at)이 자동 갱신된다.

**수용 기준**:
```
Given: 빈 계좌가 있고 balance=0이다
When: deposit_transactions에 (deposit, +1,200,000) INSERT
Then: balance = 1,200,000 / total_deposit = 1,200,000 / total_usage = 0
Then: last_recalc_at = NOW()

When: 추가로 (usage, +200,000) INSERT
Then: balance = 1,000,000 / total_deposit = 1,200,000 / total_usage = 200,000

When: 위 (deposit, +1,200,000) 트랜잭션을 void 처리한다 (voided_at 설정)
Then: balance = -200,000 / total_deposit = 0 / total_usage = 200,000
Then: voided 트랜잭션은 집계에서 제외된다

Given: adjustment 타입으로 amount=-50,000 INSERT
Then: balance = balance - 50,000 (adjustment는 부호 그대로 적용)
Then: total_deposit/total_usage에는 반영되지 않음 (별도 보정 항목)
```

**비고**: 트리거 구현은 `deposit_transactions` AFTER INSERT/UPDATE에서 voided_at IS NULL 조건으로 SUM 재계산. PostgreSQL의 `SECURITY DEFINER` + `search_path` 명시 필요 (MEMORY.md 참조).

---

#### FR-5: 메인 대시보드 — 글로벌 KPI + 카드 그리드
**설명**: 사이드바 "예치금" 메뉴 진입 시 전체 계좌의 KPI와 카드 리스트를 한눈에 본다.

**화면 구성** (프로토타입 `/test-ui-preview/deposit/operation/page.tsx` 기준):
- 상단: 글로벌 KPI 4박스
  1. **총 예치액**: USD 합계 / KRW 합계 (두 줄) + "USD N건 · KRW N건"
  2. **누적 사용액**: USD/KRW 두 줄 + 예치 대비 % (각각)
  3. **현재 잔액**: USD/KRW 두 줄 (강조 색)
  4. **알림 필요**: 긴급 N건 / 주의 N건 (통화 무관 합산)
- 중단: 필터 버튼 — 전체 / 긴급 / 주의 (단일 선택, 상태 표시)
- 하단: 계좌 카드 그리드 (2열, 반응형: 모바일 1열)

**수용 기준**:
```
Given: 사용자가 /deposit (사이드바 메뉴) 진입
When: 페이지 로드된다
Then: 로딩 중 Skeleton UI 표시 (KPI 박스 4개 + 카드 6개 분량)
Then: 데이터 fetch 완료 시 300ms 이내에 실데이터로 교체된다
Then: KPI 박스 4개가 통화별로 분리되어 표시된다 (환산 합산 없음)

Given: 활성화된 계좌가 0건이다
When: 페이지 로드
Then: Empty State "아직 등록된 예치금 계좌가 없습니다. MSP 계약 상세 페이지에서 활성화하세요." 표시
And: "계약 목록 보기" CTA 버튼 표시 → /contracts?type=msp로 이동

Given: 필터 "긴급" 클릭
When: 클릭 직후
Then: 카드 그리드가 alertLevel='critical'인 것만 표시
Then: 필터 버튼이 활성 상태(빨간색 배경)로 변경
Then: URL 쿼리에 ?filter=critical 추가 (브라우저 뒤로가기 호환)
```

---

#### FR-6: 계약 상세 — 예치금 탭
**설명**: `/contracts/[id]` 상세 페이지에 "예치금" 탭을 추가한다. 단일 계좌의 상세 화면.

**화면 구성**:
- 단일 카드 (대시보드 카드와 동일한 정보, 하지만 더 크고 풀폭)
- 트랜잭션 전체 내역 테이블 (페이지네이션, 기본 30건/페이지)
- 액션: + 예치 등록 / − 사용분 등록 / 잔액 보정(adjustment) / 환불(refund)
- 비활성 계좌인 경우: "예치금 계좌 활성화" 버튼 표시 (FR-1과 동일)

**수용 기준**:
```
Given: MSP 계약 상세 페이지에 있다
When: "예치금" 탭 클릭
Then: 해당 계약의 예치금 계좌 상세가 표시된다
Then: 트랜잭션 테이블은 기본 txn_date DESC 정렬

Given: 비-MSP 계약(Education/Dev)이다
When: 상세 페이지 로드
Then: "예치금" 탭 자체가 표시되지 않는다
```

---

#### FR-7: 알림 레벨 자동 계산 (표시만)
**설명**: 각 계좌의 잔액 % 및 소진 예상 일수를 기반으로 알림 레벨을 코드에서 계산하여 UI에 표시한다. **DB 컬럼/임계값 컬럼 없음. Slack 알림 등 외부 알림은 MVP 제외.**

**알림 레벨 룰** (코드 상수, 프로토타입과 동일):
| 레벨 | 조건 | UI 색상 |
|------|------|---------|
| critical (긴급) | balancePct < 10% **또는** daysUntilDepleted < 14일 | 빨간색 |
| warning (주의) | balancePct < 25% **또는** daysUntilDepleted < 45일 | 호박색 |
| ok (정상) | 그 외 | 초록색 |

**계산 룰**:
- `balancePct = balance / total_deposit * 100` (total_deposit=0이면 0)
- `avgMonthlyUsage = total_usage / usage 트랜잭션 건수` (건수=0이면 0)
- `daysUntilDepleted = balance / avgMonthlyUsage * 30` (avgMonthlyUsage=0이면 Infinity → "—" 표시)

**수용 기준**:
```
Given: balance = 1,000,000 / total_deposit = 10,000,000 (10%)
Then: balancePct = 10 → 경계값 (조건은 < 10%)이므로 warning

Given: balance = 50,000 / total_deposit = 1,000,000 / usage 트랜잭션 3건, total_usage = 950,000
Then: avgMonthlyUsage = 316,666 → daysUntilDepleted = 4.7 → critical (< 14일)
Then: 카드 우측 상단 배지 "긴급" + 카드 테두리 빨간색

Given: usage 트랜잭션이 0건이다
Then: daysUntilDepleted는 Infinity → "—"로 표시
Then: balancePct만으로 레벨 판정
```

---

### 2.2 부가 기능 (P1 — Should)

#### FR-8: 트랜잭션 보정 — adjustment
**설명**: 입력 실수, 환불 외 사유로 잔액을 조정해야 할 때 양수/음수 모두 입력 가능한 adjustment 트랜잭션을 등록한다.

**수용 기준**:
```
Given: 관리자 권한 사용자다 (영업/사내담당은 adjustment 불가)
When: "잔액 보정" 버튼 클릭 → 모달 오픈
And: amount에 양수 또는 음수 입력 (0 제외), memo 필수 입력 (최소 5자)
Then: deposit_transactions에 (txn_type='adjustment', amount=±N) INSERT
Then: CHECK 제약 (adjustment AND amount <> 0)을 통과한다
Then: balance = balance + amount (음수면 차감)
Then: total_deposit / total_usage는 변경되지 않음 (별도 보정 트랜잭션이므로)

Given: amount=0 입력
Then: "보정 금액은 0이 될 수 없습니다" 인라인 에러
Then: 제출 차단
```

---

#### FR-9: 트랜잭션 환불 — refund
**설명**: 고객이 계약 종료/해지로 예치금을 환불받을 때 등록한다.

**수용 기준**:
```
Given: 관리자 권한 사용자다
When: "환불 등록" → 모달 → 양수 amount + memo (필수, 최소 5자)
Then: deposit_transactions에 (txn_type='refund', amount=+N) INSERT
Then: balance = balance - amount (환불은 출금이므로 차감)
Then: total_usage / total_deposit에는 반영되지 않음
Then: 카드의 "최근 입출 내역"에 "환불" 라벨로 빨간색 표시 ("-₩N")

Given: 환불 후 balance가 음수가 된다
Then: 경고 모달 "환불 후 잔액이 음수입니다. 계속하시겠습니까?" 표시
```

---

#### FR-10: 트랜잭션 무효화 (Void)
**설명**: 잘못 입력된 트랜잭션을 삭제하지 않고 무효화 처리한다 (immutable 로그 유지).

**수용 기준**:
```
Given: 사용자가 자신이 입력한 트랜잭션(또는 관리자 권한)이다
When: 트랜잭션 행의 "무효화" 버튼 클릭
Then: 확인 모달 "이 트랜잭션을 무효화합니다. 사유를 입력하세요."
And: void_reason 필수 입력 (최소 5자)
When: "확인" 클릭
Then: voided_at = NOW(), voided_by = 현재 유저, void_reason 저장
Then: 트리거가 balance/totals를 재계산 (voided 제외)
Then: UI에 "무효" 배지 + 취소선(line-through)으로 표시
Then: 무효화된 트랜잭션은 다시 무효화/수정 불가

Given: 이미 voided된 트랜잭션이다
Then: "무효화" 버튼이 비활성화된다
```

**Out**: 트랜잭션의 amount/date 수정(UPDATE)은 MVP 제외. 잘못 입력했으면 void → 새로 등록.

---

#### FR-11: 트랜잭션 내역 필터/정렬
**설명**: 계약 상세 예치금 탭의 트랜잭션 테이블에서 타입/날짜로 필터/정렬.

**수용 기준**:
```
Given: 트랜잭션 30건 이상
When: 타입 필터 "deposit" 선택
Then: deposit만 표시되고 페이지네이션이 갱신된다

When: 날짜 컬럼 헤더 클릭
Then: ASC ↔ DESC 토글, URL 쿼리에 ?sort=date_asc 등 반영
```

---

### 2.3 향후 확장 (P2 — Could / Won't in MVP)

#### FR-101: AWS Cost Explorer API 자동 차감 (Won't in MVP)
- AWS Payer 계정별 월별 사용량을 Cost Explorer API로 자동 fetch → usage 트랜잭션 자동 등록
- source='aws_api'로 구분
- 향후 별도 PRD로 분리

#### FR-102: Slack 알림 (Won't in MVP)
- 잔액 critical 진입 시 영업 담당 Slack DM 자동 발송
- 향후 별도 PRD로 분리

#### FR-103: 임계값 개별 설정 (Won't in MVP)
- 계좌별 threshold 컬럼 추가 (현재는 코드 상수)
- 고객별 다른 알림 기준 운영 시 필요

#### FR-104: 통화 환산 합계 (Won't in MVP)
- 환율 컬럼 추가하여 USD+KRW 통합 합계 표시
- 회계 영역과 겹치므로 보류

#### FR-201: 빌링온 데이터 import (Could)
- 기존 빌링온 엑셀/CSV 일괄 업로드로 과거 트랜잭션 이관
- 마이그레이션 1회성 작업

---

## 3. 비기능 요구사항

### 성능
- 메인 대시보드 TTI 3초 이내 (계좌 30건 기준)
- 트랜잭션 INSERT 응답 시간 1초 이내
- 잔액 추이 차트 렌더링 200ms 이내 (트랜잭션 100건 이하)

### 보안 / 권한
| 역할 | 조회 | 입금/차감 | adjustment | refund | void |
|------|------|----------|-----------|--------|------|
| 영업 | 자신의 담당 계약만 | O | X | X | 본인 입력분만 |
| 사내 담당자 | 전체 | O | X | X | 본인 입력분만 |
| 관리자 | 전체 | O | O | O | 전체 |

- RLS 정책: `deposit_accounts`는 contracts와 동일한 가시성 룰 상속 (영업은 자신 담당 contracts.sales_rep_id만)
- `deposit_transactions`는 account_id를 통해 동일하게 상속
- adjustment/refund/void는 profiles.role = 'admin'에서만 허용
- SECURITY DEFINER 트리거 함수 작성 시 `SET search_path = public` 명시 필수 (MEMORY.md 참조)

### 데이터 무결성
- `deposit_accounts.contract_id`에 UNIQUE 제약 (1:1)
- `deposit_transactions.amount`에 CHECK 제약:
  - `deposit/usage/refund`는 amount > 0
  - `adjustment`는 amount <> 0 (음수 허용)
- soft delete: accounts는 `deleted_at`, transactions는 `voided_at`
- 트리거는 voided_at IS NULL 기준으로만 집계

### 접근성
- WCAG 2.2 AA 준수
- 알림 레벨 색상에만 의존하지 않음: 배지 텍스트("긴급/주의/정상") + 아이콘(CircleAlert) 병기
- 모달 키보드 네비게이션 (ESC=닫기, Enter=제출), focus trap
- 차트는 screen reader용 aria-label 또는 인접 table fallback

### 호환성
- Next.js 15 App Router + RSC 컴포넌트 우선, 인터랙션은 Client Component로 분리
- TanStack Query로 캐싱 (key: `['deposit-accounts']`, `['deposit-account', accountId]`)
- shadcn/ui Dialog, Form (React Hook Form + Zod), Table 사용
- Tailwind v4

---

## 4. 화면 목록

| # | 화면명 | 경로 | 설명 | 진입 경로 |
|---|--------|------|------|----------|
| S1 | 예치금 대시보드 | `/deposit` | 전체 계좌 KPI + 카드 그리드 | 사이드바 "예치금" 메뉴 |
| S2 | 계약 상세 — 예치금 탭 | `/contracts/[id]?tab=deposit` | 단일 계좌 상세 + 트랜잭션 테이블 | 계약 상세 페이지 탭 |
| M1 | 입금 등록 모달 | (모달) | deposit 트랜잭션 등록 폼 | S1 카드의 "+ 예치 등록" / S2의 동일 버튼 |
| M2 | 사용분 등록 모달 | (모달) | usage 트랜잭션 등록 폼 | S1 / S2의 "− 사용분 등록" |
| M3 | 보정 등록 모달 | (모달) | adjustment 트랜잭션 (관리자) | S2의 "잔액 보정" |
| M4 | 환불 등록 모달 | (모달) | refund 트랜잭션 (관리자) | S2의 "환불 등록" |
| M5 | 무효화 확인 모달 | (모달) | void_reason 입력 + 확인 | 트랜잭션 행의 "무효화" |
| M6 | 계좌 활성화 확인 모달 | (모달) | 활성화 안내 + 확인 | S2에서 비활성 상태일 때 |

---

## 5. 상태 정의

### S1: 예치금 대시보드 (`/deposit`)

| 상태 | 화면 구성 | 메시지/UI |
|------|----------|----------|
| **Default** | 글로벌 KPI + 필터 + 카드 그리드 | 프로토타입 그대로 |
| **Loading** | KPI 박스 4개 Skeleton + 카드 6개 Skeleton (300ms 이내면 표시 생략) | shadcn `<Skeleton>` |
| **Empty** | KPI는 모두 0 표시 / 카드 영역에 빈 상태 UI | "아직 등록된 예치금 계좌가 없습니다. MSP 계약 상세에서 활성화하세요." + CTA "계약 목록 보기" |
| **Error** | 페이지 중앙 Alert | "예치금 데이터를 불러올 수 없습니다. 잠시 후 다시 시도해주세요." + 재시도 버튼 |
| **Filter Empty** | KPI는 그대로 / 카드 영역만 빈 상태 | "긴급 알림 계좌가 없습니다 " (정상 상태) — 아이콘+텍스트 |

### S2: 계약 상세 — 예치금 탭

| 상태 | 화면 구성 | 메시지/UI |
|------|----------|----------|
| **Default (활성)** | 풀폭 단일 카드 + 트랜잭션 테이블 | - |
| **Default (비활성)** | 안내 영역만 표시 | "이 계약은 아직 예치금 추적이 활성화되지 않았습니다." + CTA "예치금 계좌 활성화" |
| **Loading** | 카드 Skeleton + 테이블 Skeleton | - |
| **Empty (활성, 트랜잭션 0건)** | 카드는 모든 값 0 / 테이블 빈 상태 | "아직 트랜잭션이 없습니다. 첫 입금을 등록하세요." + CTA "+ 예치 등록" |
| **Error** | 탭 영역 내 Alert | "데이터 로드 실패" + 재시도 |
| **권한 없음** | 탭 자체 숨김 (영업이 타 담당 계약 진입 시) | (RLS로 자동 차단) |

### M1~M4: 트랜잭션 등록 모달 (공통)

| 상태 | 화면 구성 | 메시지/UI |
|------|----------|----------|
| **Default** | 폼 필드 + 등록/취소 버튼 | 등록 버튼 활성 |
| **Validating** | 필드별 인라인 에러 표시 | "입금액은 1원 이상이어야 합니다" 등 |
| **Submitting** | 등록 버튼 비활성 + Spinner | "등록 중..." |
| **Success** | 모달 닫힘 → 토스트 | "입금 ₩1,200,000원이 등록되었습니다" (3초 자동 닫힘) |
| **Error (서버)** | 모달 내 Alert (상단) + 폼 데이터 유지 | "등록에 실패했습니다. 다시 시도해주세요." + 입력값 유지 |
| **Warning (음수 잔액)** | 2차 확인 모달 (M2/M4) | "차감 후 잔액이 음수가 됩니다. 계속하시겠습니까?" |

---

## 6. 유저 플로우

### 6.1 Primary Flow — 영업이 예치금 등록 → 사용분 차감 → 잔액 확인

```
[영업이 사이드바 "예치금" 클릭]
   ↓
[S1: 예치금 대시보드 진입]
   ↓
[KPI에서 자신 담당 고객 중 알림 필요 N건 확인]
   ↓
[해당 계좌 카드 발견 → 카드 내 "+ 예치 등록" 클릭]
   ↓
[M1: 입금 등록 모달 오픈]
   ↓
[txn_date(오늘) / amount(12,000,000) / memo("연간 선결제") 입력]
   ↓
[등록 클릭]
   ↓
[Submitting → Success 토스트 → 모달 닫힘]
   ↓
[카드 잔액/추이/내역 즉시 갱신, 알림 레벨 ok로 변경]
```

월말 시나리오:
```
[사내 담당자가 매월 1일 사용분 정산]
   ↓
[S1 진입 → 전체 활성 계좌 리스트 확인]
   ↓
[각 계좌별로 "− 사용분 등록" 모달에서 전월 AWS 사용분 입력]
   ↓
[memo에 "AWS 4월 사용분" 표준 포맷 입력]
   ↓
[저장 → 잔액 자동 갱신 → 알림 레벨 자동 변경]
```

### 6.2 Alternative Flow

**A1. 비활성 계좌의 첫 활성화 (계약 상세에서 시작)**
```
[영업이 신규 MSP 계약 생성 직후 계약 상세 진입]
   → [예치금 탭 클릭 → 비활성 안내 화면]
   → ["예치금 계좌 활성화" 클릭]
   → [M6: 확인 모달 "이 계약에 예치금 추적을 활성화합니다"]
   → [확인 → S2 활성 상태로 전환]
   → [Empty State → "+ 예치 등록"으로 진행]
```

**A2. 무효화 후 재등록**
```
[잘못 입력한 트랜잭션 발견]
   → [트랜잭션 행 "무효화" 클릭]
   → [M5: void_reason 입력]
   → [확인 → 잔액 재계산]
   → [올바른 값으로 신규 등록]
```

**A3. 환불 처리 (계약 종료)**
```
[관리자가 계약 종료 시 잔액 환불]
   → [S2의 "환불 등록" 클릭]
   → [M4: amount(잔액 전액) + memo("2026-12-31 계약 종료 환불")]
   → [등록 → balance = 0]
```

### 6.3 Error Flow

**E1. 동시 편집 충돌**
```
[유저 A가 모달 열어 amount 입력 중]
[유저 B가 동일 계좌에 입금 등록 완료]
   → [유저 A가 등록 클릭]
   → [서버는 amount 그대로 INSERT 가능 (append-only이므로 충돌 없음)]
   → [Success 토스트]
   → [TanStack Query invalidate → A의 화면도 자동으로 B의 입력 반영됨]
```
→ **결론**: 트랜잭션이 append-only이므로 충돌이 발생하지 않음. 잔액은 트리거가 항상 정합성 보장.

**E2. 권한 없음**
```
[영업이 다른 담당자의 계약 URL에 직접 접근]
   → [RLS가 deposit_accounts SELECT 차단]
   → [예치금 탭 진입 시 "권한 없음" 안내 + 계약 목록으로 이동 CTA]
```

**E3. 네트워크 끊김 (모달 제출 중)**
```
[등록 클릭 → API 호출]
   → [네트워크 끊김 → timeout]
   → [모달 내 Alert "응답 시간이 초과되었습니다. 다시 시도해주세요."]
   → [폼 데이터 유지 / 등록 버튼 재활성]
   → [재시도 → 성공]
```

**E4. DB 트리거 실패 (캐시 갱신 실패)**
```
[INSERT는 성공, AFTER 트리거에서 예외 발생]
   → [트랜잭션 롤백 (BEGIN/COMMIT 단위)]
   → [클라이언트에 500 응답]
   → [모달 Alert "등록 처리 중 오류가 발생했습니다. 관리자에게 문의하세요."]
```

---

## 7. 에러 시나리오 상세

### 7.1 유효성 검사 에러 (Validation)

| 필드 | 규칙 | 에러 메시지 | 검증 시점 |
|------|------|------------|----------|
| amount (deposit/usage/refund) | 1 이상의 정수 | "금액은 1원/달러 이상이어야 합니다" | 포커스 아웃 |
| amount (adjustment) | 0이 아닌 정수 | "보정 금액은 0이 될 수 없습니다" | 포커스 아웃 |
| amount (모든 타입) | 최대 9,999,999,999 | "금액이 너무 큽니다 (최대 99억)" | 실시간 |
| txn_date | 미래 30일 이상 X | "30일 이상 미래 날짜는 입력할 수 없습니다" | 포커스 아웃 |
| txn_date | 2020-01-01 이전 X | "유효한 날짜를 입력하세요" | 포커스 아웃 |
| memo | 최대 200자 | "메모는 200자 이내로 작성하세요" | 실시간 |
| memo (adjustment/refund/void) | 최소 5자 | "사유를 5자 이상 입력하세요" | 제출 시 |

### 7.2 비즈니스 로직 에러

| 코드 | 상황 | 동작 |
|------|------|------|
| BIZ-1 | 차감 후 잔액 음수 | 2차 확인 모달 → 사용자가 "계속" 선택 시 진행 |
| BIZ-2 | 중복 활성화 시도 (UNIQUE 위반) | "이미 활성화된 계좌가 있습니다" 토스트 + 화면 reload |
| BIZ-3 | 비-MSP 계약에 활성화 시도 | (UI에서 탭 자체가 안 보이므로 발생 X. API 단에서도 contracts.business_unit 체크) |
| BIZ-4 | voided 트랜잭션을 다시 void | 버튼 비활성화, API 단에서도 409 응답 |

### 7.3 시스템 에러

| HTTP | 상황 | 사용자 메시지 |
|------|------|--------------|
| 401 | 세션 만료 | "로그인이 만료되었습니다" → 로그인 페이지 |
| 403 | 권한 없음 (adjustment를 영업이 시도) | "이 작업에는 관리자 권한이 필요합니다" 토스트 |
| 409 | 중복 활성화 / 이미 void | 케이스별 메시지 (위 표) |
| 500 | 서버 에러 | "일시적인 오류입니다. 잠시 후 다시 시도해주세요." |
| timeout | 응답 지연 | "응답 시간 초과. 다시 시도해주세요." |

### 7.4 엣지케이스

| # | 케이스 | 예상 동작 |
|---|-------|----------|
| EC-1 | 계좌 활성화 후 트랜잭션 0건 상태로 1년 방치 | Empty State 유지, 알림 레벨은 'ok'(분모가 0) |
| EC-2 | 첫 트랜잭션이 usage (입금 없이 차감) | total_deposit=0이므로 balancePct 계산 시 0 처리 → critical |
| EC-3 | 동일 날짜에 입금/차감 다수 등록 | 모두 별도 트랜잭션으로 저장, 순서는 created_at으로 정렬 |
| EC-4 | total_deposit이 0인데 balance > 0 (모두 adjustment로 만들어진 잔액) | balancePct는 0으로 표시 / KPI 박스에는 그대로 합산 |
| EC-5 | 트랜잭션 100건 이상 | 차트는 최근 30건만 / 테이블은 페이지네이션 |
| EC-6 | 통화가 USD인 계좌 (현재 KRW만 있지만 향후 대비) | 카드 내 모든 금액 $ 기호 표시 / KPI에 USD 라인으로 합산 |
| EC-7 | 모달 작성 중 브라우저 뒤로가기 | 변경사항 있으면 "변경사항이 저장되지 않습니다. 나가시겠습니까?" beforeunload |
| EC-8 | 매우 긴 memo (200자 한계) | 카드 내 표시 시 말줄임(...) + hover/click 시 전체 표시 |
| EC-9 | 계약이 삭제(soft delete)됨 | deposit_accounts도 자동 soft delete (CASCADE 정책 또는 트리거) → 대시보드에서 제외 |
| EC-10 | 다중 탭에서 동일 계좌 편집 | append-only이므로 충돌 없음. invalidate로 다른 탭도 갱신 (TanStack Query refetchOnWindowFocus) |

---

## 8. 구현 우선순위 (RICE → MoSCoW)

| FR | 기능 | R | I | C | E | RICE | MoSCoW | 구현 순서 |
|----|------|---|---|---|---|------|--------|----------|
| FR-1 | 예치금 계좌 자동 생성 | 8 | 2 | 100% | 2 | 8.0 | **Must** | 1 |
| FR-2 | 입금 트랜잭션 등록 | 10 | 3 | 100% | 3 | 10.0 | **Must** | 2 |
| FR-3 | 사용분 차감 등록 | 10 | 3 | 100% | 3 | 10.0 | **Must** | 3 |
| FR-4 | 잔액 자동 계산 (트리거) | 10 | 3 | 100% | 4 | 7.5 | **Must** | 4 |
| FR-5 | 메인 대시보드 | 10 | 2 | 100% | 5 | 4.0 | **Must** | 5 |
| FR-6 | 계약 상세 예치금 탭 | 8 | 2 | 100% | 3 | 5.3 | **Must** | 6 |
| FR-7 | 알림 레벨 표시 | 8 | 2 | 100% | 1 | 16.0 | **Must** | 7 |
| FR-10 | 트랜잭션 무효화 (Void) | 6 | 2 | 80% | 2 | 4.8 | **Should** | 8 |
| FR-8 | adjustment 보정 | 4 | 2 | 80% | 2 | 3.2 | **Should** | 9 |
| FR-9 | refund 환불 | 4 | 2 | 80% | 2 | 3.2 | **Should** | 10 |
| FR-11 | 트랜잭션 필터/정렬 | 6 | 1 | 80% | 2 | 2.4 | **Should** | 11 |
| FR-201 | 빌링온 import (Could) | 3 | 1 | 50% | 4 | 0.4 | **Could** | 여유 시 |
| FR-101 | AWS API 자동 차감 | — | — | — | — | — | **Won't** (MVP) | 별도 PRD |
| FR-102 | Slack 알림 | — | — | — | — | — | **Won't** (MVP) | 별도 PRD |
| FR-103 | 임계값 개별 설정 | — | — | — | — | — | **Won't** (MVP) | 별도 PRD |
| FR-104 | 통화 환산 합계 | — | — | — | — | — | **Won't** (MVP) | 회계 영역 |

**비율 검증**: Must 7건(58%) / Should 4건(33%) / Could 1건(8%) / Won't 4건 — 정상 분포.

**RICE 산출 근거 메모**:
- R=10 (전체 영업+사내담당+관리자), R=8 (영업+사내담당), R=6 (사내담당+관리자), R=4 (관리자 위주)
- I=3 (없으면 서비스 불가), I=2 (생산성 큰 영향), I=1 (편의)
- C=100% (프로토타입에서 검증됨), 80% (DB 설계는 확정이지만 UX는 사용해봐야 앎), 50% (확장)
- E=인일 단위 (1=하루, 5=일주일)

---

## 9. 명시적 비범위 (Out of Scope)

**MVP에서 명시적으로 제외하는 항목** — 다음 페이즈/별도 PRD에서 다룬다:

| 항목 | 제외 이유 | 향후 처리 |
|------|----------|----------|
| **AWS Cost Explorer API 자동 차감** | API 연동 비용/복잡도 / Payer 계정별 매핑 정리 선행 필요 | Phase 2 별도 PRD |
| **Slack 알림 (잔액 임계 진입 시 자동 DM)** | 알림 채널 정책 합의 필요 / 임계값 개인화도 함께 다뤄야 | Phase 2 별도 PRD |
| **임계값 개별 설정 (계좌별 threshold 컬럼)** | MVP는 코드 상수 (10%/25%, 14일/45일)로 충분 | Slack 알림과 묶어서 |
| **회계 매출 인식 스케줄 (B안)** | ERP/회계 시스템 영역 / 회계 표준 정책 미정 | ERP 통합 시 |
| **통화 환산 합계 (KRW+USD 통합)** | 환율 정책 / 회계 영역과 겹침 | 회계 통합 시 |
| **트랜잭션 amount/date 수정 (UPDATE)** | immutable 로그 원칙 / void → 신규 등록으로 대체 | 영구 미지원 |
| **계좌 자체의 archive/close** | 계약 종료 시 환불(refund)로 처리 | 필요 시 추가 |
| **다중 통화 계좌** | 한 계좌 = 한 통화 (계약의 통화와 동일) | 영구 미지원 |
| **트랜잭션 첨부파일** (영수증 등) | Supabase Storage 정책 합의 필요 | Phase 2+ |
| **트랜잭션 일괄 등록 (CSV import)** | MVP는 건별 입력 / 마이그레이션 도구는 일회성 | 빌링온 import와 함께 (FR-201) |
| **트랜잭션 검색 (memo 텍스트 검색)** | 트랜잭션 30건 이하 환경에서는 불필요 | 100건 초과 시 |
| **대시보드 통계/리포트 export (PDF, Excel)** | MVP는 운영 트래킹에 집중 | 회계 요구 발생 시 |
| **고객(외부) 포털에서 예치금 잔액 조회** | 내부용 CRM 범위를 벗어남 | 별도 서비스 |
| **트랜잭션 승인 워크플로우 (영업→관리자 결재)** | 현재 신뢰 기반 운영, 워크플로우 오버헤드 큼 | 규모 확장 시 |

---

## 10. 휴리스틱 검증

닐슨 10가지 중 필수 4가지를 점검한다.

### #1 시스템 상태 가시성 (Visibility of System Status) ✓
- 로딩 상태: Skeleton UI / Spinner 정의됨 (FR-5, M1~M4)
- 작업 완료: 등록 후 즉시 카드 갱신 + 토스트
- 진행: 모달 Submitting 상태 명시
- 현재 위치: 사이드바 활성 메뉴, 탭 활성 상태 강조
- **갭 없음**

### #5 에러 예방 (Error Prevention) ✓
- 차감 후 음수 잔액 → 2차 확인 모달 (FR-3)
- 권한 없는 기능은 UI 자체에서 숨김 (영업에게 adjustment 버튼 미노출)
- 비-MSP 계약에는 예치금 탭 자체 미노출
- 무효화 시 사유 필수 입력 (실수 방지)
- 입력 제약 사전 표시 (placeholder, helper text)
- **갭**: amount 입력 시 천 단위 콤마 표시는 권장 사항 → 구현 시 반영

### #9 에러 인식/진단/복구 (Recognize, Diagnose, Recover) ✓
- 모든 에러 메시지가 원인 + 해결 방법 포함 (예: "응답 시간 초과. 다시 시도해주세요.")
- 인라인 필드 에러: 해당 필드 바로 아래 빨간색 텍스트
- 모달 Alert: 모달 상단, 폼 데이터 유지
- 권한 에러: 명확한 사유 ("이 작업에는 관리자 권한이 필요합니다")
- **갭 없음**

### #4 일관성과 표준 (Consistency and Standards) ✓
- 라벨링: "+ 예치 등록" / "− 사용분 등록" / "잔액 보정" / "환불 등록" / "무효화" — 동사 명령형 일관
- 색상: critical=red, warning=amber, ok=emerald (기존 design system 토큰 사용)
- 모달 구조: 헤더-바디-푸터(취소/등록) 동일 패턴
- 버튼 위치: 등록 우측, 취소 좌측 (shadcn 표준)
- 통화 표기: `formatAmount(n, currency)` 일관 (KRW=₩, USD=$)
- **갭 없음**

### 추가 권장 (Recognition over Recall, Hick's Law)
- 트랜잭션 등록 시 txn_date 기본값 = 오늘 (deposit) / 전월말 (usage) → 인지 부담 감소
- 액션 버튼은 카드 하단에 항상 동일 위치 (Fitts's Law)
- 한 화면에 액션 4개 이하 (Hick's Law)

---

## 11. 릴리즈 계획

### Phase 1 — MVP (목표: 2026-06-30)
**스코프**: Must 7건 (FR-1~7)

- [ ] DB 마이그레이션: deposit_accounts + deposit_transactions + ENUM 2종
- [ ] 트리거 함수: 잔액/totals 자동 갱신 (SECURITY DEFINER + search_path)
- [ ] RLS 정책: contracts 가시성 상속
- [ ] API: 계좌 활성화, 트랜잭션 등록 (deposit/usage)
- [ ] UI: 메인 대시보드 (`/deposit`)
- [ ] UI: 계약 상세 예치금 탭
- [ ] UI: 입금/사용 등록 모달
- [ ] 더미 데이터 시딩 (pm-dummy-dataset 활용)

**완료 기준**: 영업이 예치금 등록 → 사용분 차감 → 잔액 확인 Primary Flow 완수 가능

### Phase 2 — 개선 (목표: 2026-07-31)
**스코프**: Should 4건 (FR-8~11)

- [ ] adjustment, refund 트랜잭션 (관리자 전용)
- [ ] 트랜잭션 무효화 (void) + 사유 입력
- [ ] 트랜잭션 테이블 필터/정렬
- [ ] 권한별 UI 분기 (관리자 vs 영업/사내담당)

### Phase 3 — 확장 (목표: 2026-Q3~Q4)
**스코프**: Could / Won't 일부 승격

- [ ] 빌링온 CSV import (1회성 마이그레이션)
- [ ] AWS Cost Explorer API 자동 차감 (별도 PRD)
- [ ] Slack 알림 (별도 PRD)
- [ ] 임계값 개별 설정

---

## 12. 데이터 모델 참조

본 PRD가 전제하는 DB 스키마는 기획 단계에서 확정됨. 구현 시 그대로 따른다.

```sql
CREATE TYPE deposit_txn_type AS ENUM ('deposit', 'usage', 'adjustment', 'refund');
CREATE TYPE deposit_txn_source AS ENUM ('manual', 'aws_api', 'billing_on');

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
  CHECK (
    (txn_type IN ('deposit','usage','refund') AND amount > 0)
    OR (txn_type = 'adjustment' AND amount <> 0)
  )
);

CREATE INDEX idx_deposit_txn_account_date ON deposit_transactions(account_id, txn_date DESC) WHERE voided_at IS NULL;
```

**컬럼 의미**:
- `balance / total_deposit / total_usage`: 트리거로 자동 갱신되는 캐시
- `last_recalc_at`: 마지막 트리거 실행 시각 (디버깅용)
- `voided_at/by/reason`: soft delete 패턴, immutable 로그 유지
- `source`: MVP는 'manual'만, 향후 'aws_api', 'billing_on' 확장

---

## 미결 사항 (Open Items)

> [!WARNING] **OPEN-1**: contracts soft delete 시 deposit_accounts 처리 정책
> - 옵션 A: contracts.deleted_at 트리거로 deposit_accounts도 deleted_at 설정
> - 옵션 B: ON DELETE 무관, 별도 운영 (수동 정리)
> - 권장: A (자동), 구현 단계에서 확정

> [!WARNING] **OPEN-2**: 권한 매트릭스의 "영업의 본인 입력분 void" 허용 여부
> - 본 PRD: 본인 입력분만 허용 (관리자는 전체)
> - 운영 리스크: 영업이 실수 후 본인이 void하고 재등록 가능 vs 관리자 결재 필요
> - 합의 필요: 동식님과 정책 컨펌

> [!WARNING] **OPEN-3**: 현재 운영 중인 57건의 MSP 계약 중 실제 선결제 예치금 운영 건수와 빌링온 데이터 이관 시점
> - 본 PRD는 신규 계약 등록 위주
> - 기존 운영 건의 과거 트랜잭션 일괄 입력 도구 필요 시 FR-201 (빌링온 import) 우선순위 재조정

> [!WARNING] **OPEN-4**: usage 트랜잭션의 memo 표준 포맷
> - 권장: "AWS YYYY-MM 사용분"
> - 자동 완성/플레이스홀더로 가이드 제공
> - 향후 AWS API 자동 연동 시 표준 포맷 강제 가능

---

## 다음 단계

이 PRD는 Phase 1(기획) 산출물이다. 후속 단계:

1. **Phase 2: 기획 검증** — `/spec-review` 커맨드로 인터뷰 기반 이슈 발굴
2. **Phase 2.5: 리스크 분석** — `/pre-mortem`으로 Tiger/Paper Tiger/Elephant 분류
3. **Phase 3: UI 설계** — Pencil MCP로 .pen 파일 작성 (프로토타입을 디자인 시스템에 정합)
4. **Phase 4: 구현 계획** — `superpowers:writing-plans`로 작업 분할
5. **Phase 4.5: 테스트 계획** — `/test-scenarios`로 본 PRD 기반 테스트 매트릭스
6. **Phase 5: Foundation** — 마이그레이션 + 트리거 + RLS + `pm-dummy-dataset` 시딩

각 Phase는 사용자 확인 후 진행. Phase 간 자동 호출 금지.

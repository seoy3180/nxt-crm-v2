# Test Plan: 예치금 대시보드

> 생성일: 2026-05-15
> 소스: `docs/prd/deposit-dashboard.md` (Phase 1~3 + Part 4 Pre-mortem)
> 구현 계획: `docs/superpowers/plans/2026-05-15-deposit-dashboard.md`
> 총 테스트 케이스: **47개** (P0: 13개, P1: 18개, P2: 16개)
> 인증 방식: Supabase 시드 계정 (`supabase/seed/create-test-users.sql` + 6명 테스트 계정, MEMORY.md 참고)

---

## 커버리지 매트릭스

| spec.md 항목 | 테스트 케이스 | 커버 여부 |
|---|---|---|
| §6.1 Primary Flow (영업 등록) | HP-1 | ✓ |
| §6.1 Primary Flow (월말 정산) | HP-2 | ✓ |
| §6.2 A1 비활성→활성화 | AF-1 | ✓ |
| §6.2 A2 무효화 후 재등록 | AF-2 | ✓ |
| §6.2 A3 환불 처리 | AF-3 | ✓ |
| §6.3 E1 동시 편집 (append-only) | EF-1 | ✓ |
| §6.3 E2 권한 없음 | EF-2 | ✓ |
| §6.3 E3 네트워크 끊김 | EF-3 | ✓ |
| §6.3 E4 DB 트리거 실패 | EF-4 | ✓ |
| §7.1 amount > 0 (deposit/usage/refund) | VT-1 | ✓ |
| §7.1 amount adjustment ≠ 0 | VT-2 | ✓ |
| §7.1 amount 99억 한계 | VT-3 | ✓ |
| §7.1 txn_date 미래 30일 이상 | VT-4 | ✓ |
| §7.1 txn_date 2020 이전 | VT-5 | ✓ |
| §7.1 memo 200자 한계 | VT-6 | ✓ |
| §7.1 adjustment/refund/void memo 5자 | VT-7 | ✓ |
| §7.2 BIZ-1 음수 잔액 2차 확인 | BL-1 | ✓ |
| §7.2 BIZ-2 중복 활성화 | BL-2 | ✓ |
| §7.2 BIZ-3 비-MSP 활성화 | BL-3 | ✓ |
| §7.2 BIZ-4 voided 재 void | BL-4 | ✓ |
| §7.2 BIZ-5 잔액 != 0 계약 삭제 | BL-5 | ✓ |
| §7.2 BIZ-6 트랜잭션 있는 계좌 비활성화 | BL-6 | ✓ |
| §7.3 401 세션 만료 | AS-1 | ✓ |
| §7.3 403 권한 부족 | AS-2 | ✓ |
| §7.3 409 중복/voided | AS-3 | ✓ |
| §7.3 500 서버 에러 | AS-4 | ✓ |
| §7.3 timeout | AS-5 | ✓ |
| §7.4 EC-1~10 (전체) | EC-1 ~ EC-10 | ✓ |
| §3 성능 (TTI 3초) | NF-1 | ✓ |
| §3 성능 (INSERT 1초) | NF-2 | ✓ |
| §3 성능 (차트 200ms) | NF-3 | ✓ |
| §3 접근성 WCAG AA | NF-4 | ✓ |
| §3 키보드 네비게이션 | NF-5 | ✓ |
| Part 4 T-1 잔액 정합성 | TG-1 | ✓ |
| Part 4 T-2 계약 삭제 UX | TG-2 (= BL-5) | ✓ |
| Part 4 T-3 invalidate 일관성 | TG-3 | ✓ |
| Part 4 T-4 트리거 성능 | TG-4 | ✓ |
| Part 4 T-5 search_path 보안 | TG-5 | ✓ |

**커버리지: 38/38 항목 100%**

---

## P0 테스트 (필수, 13개)

### HP-1: Primary Flow — 영업 예치금 등록 → 사용 차감 → 잔액 확인
- **출처**: §6.1 Primary Flow
- **유형**: E2E
- **사전 조건**: MSP 영업 계정 로그인. MSP 계약 1건 존재 (비활성 예치금 상태). 시드 계약 ID 사용.
- **테스트 단계**:
  1. `/deposit` 진입 → Empty State + "계약 목록 보기" CTA 표시
  2. CTA 클릭 → `/msp/contracts` 이동
  3. 시드 계약 클릭 → 상세 진입 → "예치금" 탭 클릭 → 비활성 안내 + 활성화 버튼 표시
  4. "예치금 계좌 활성화" → 확인 모달 → 활성화 진행 → 토스트 "활성화되었습니다"
  5. Empty State 카드 → "+ 예치 등록" 클릭 → 12,000,000 입력 + memo "연간 선결제" → 등록
  6. 잔액 KPI ₩ 12,000,000 즉시 갱신 + 토스트
  7. "− 사용 차감" 클릭 → 1,000,000 입력 → 등록 → 잔액 ₩ 11,000,000
- **검증 항목**:
  - [ ] 트랜잭션 등록 후 모달 자동 닫힘
  - [ ] 카드의 잔액/입출 요약/거래내역 모두 즉시 반영
  - [ ] 사이드바 "예치금" 메뉴 배지 갱신 (해당 계좌가 critical 진입했는지)
- **Playwright 힌트**: `await page.goto('/deposit'); await page.getByRole('link', { name: '계약 목록 보기' }).click();`

### HP-2: Primary Flow — 월말 사내 담당자 다건 사용 정산
- **출처**: §6.1 Primary Flow (월말 시나리오)
- **유형**: E2E
- **사전 조건**: 사내 담당자 계정. 활성 계좌 3개 시드.
- **테스트 단계**:
  1. `/deposit` 진입 → 카드 3장 (critical/warning/ok 자동 정렬 검증)
  2. 첫 카드 (critical) "− 사용 차감" → 전월 사용분 입력 → 등록
  3. 두 번째 카드도 동일 진행
- **검증 항목**:
  - [ ] critical 카드가 항상 그리드 최상단
  - [ ] 각 카드 mutation 후 정렬이 갱신됨
  - [ ] 사이드바 배지 카운트 즉시 갱신

### AF-1: 비활성 계좌 첫 활성화 (계약 상세에서)
- **출처**: §6.2 A1
- **유형**: E2E
- **우선순위**: P0 (FR-1 Must)
- **사전 조건**: MSP 계약 신규 생성 직후 상태.
- **테스트 단계**:
  1. `/msp/contracts/[id]` 진입 → 예치금 탭 클릭 → 비활성 화면
  2. "예치금 계좌 활성화" → M6 확인 모달 → 확인
  3. 활성 상태로 전환 + Empty State 카드 표시
- **검증 항목**:
  - [ ] `deposit_accounts`에 row INSERT (balance=0)
  - [ ] 활성화 버튼 사라지고 거래 등록 버튼 노출
  - [ ] 사이드바 메뉴는 변동 없음 (critical 아님)

### VT-1: amount 0 또는 음수 입력 차단 (deposit/usage/refund)
- **출처**: §7.1
- **유형**: Component
- **사전 조건**: 활성 계좌 + 거래 등록 모달 오픈.
- **테스트 단계**:
  1. txn_type=deposit, amount=0 입력 → 등록 클릭
  2. 인라인 에러 "금액은 1원/달러 이상이어야 합니다" 표시
  3. 제출 차단 (모달 유지, 서버 호출 없음)
  4. amount=-100 입력 → 동일 결과
- **검증 항목**:
  - [ ] 에러 메시지가 입력 필드 바로 아래
  - [ ] 모든 type(deposit/usage/refund) 동일 차단
  - [ ] adjustment는 별도 룰(VT-2 참고)

### VT-2: adjustment amount = 0 차단
- **출처**: §7.1
- **유형**: Component
- **사전 조건**: 관리자 계정 + 활성 계좌 + 보정 모달 오픈
- **테스트 단계**:
  1. txn_type=adjustment, amount=0 입력 → 등록
  2. 인라인 에러 "보정 금액은 0이 될 수 없습니다"
- **검증 항목**:
  - [ ] amount=+1 / -1 모두 허용
  - [ ] amount=0만 차단
  - [ ] DB CHECK 제약과 일치 (CHECK 우회 시도해도 DB 차단)

### BL-1: 차감 후 잔액 음수 → 2차 확인 모달
- **출처**: §7.2 BIZ-1
- **유형**: E2E
- **사전 조건**: 활성 계좌, 현재 잔액 ₩ 100,000.
- **테스트 단계**:
  1. "− 사용 차감" → amount=150,000 → 등록
  2. 경고 모달 "차감 후 잔액이 ₩-50,000으로 음수가 됩니다. 계속하시겠습니까?"
  3. "취소" 클릭 → 모달 유지, 트랜잭션 미등록
  4. 다시 등록 → 경고 모달 → "계속" → 등록 진행 → 잔액 ₩-50,000
  5. 카드 알림 레벨 자동으로 critical (balancePct<0)
- **검증 항목**:
  - [ ] 음수 확인 모달이 1차 등록 클릭에 표시
  - [ ] "계속" 선택 시 트랜잭션 INSERT 성공
  - [ ] 잔액이 음수여도 DB CHECK 통과 (amount > 0이지 balance ≠ 음수 금지)

### BL-2: 중복 활성화 시도 차단
- **출처**: §7.2 BIZ-2
- **유형**: E2E
- **사전 조건**: 이미 활성화된 계좌.
- **테스트 단계**:
  1. (개발자 도구로) 비활성 UI를 강제 표시 후 활성화 버튼 클릭 (또는 API 직접 호출)
  2. UNIQUE 제약 위반 → API 409 응답
  3. 토스트 "이미 활성화된 계좌가 있습니다" + 화면 reload
- **검증 항목**:
  - [ ] UI에서는 활성화 버튼이 노출되지 않아야 함 (정상 흐름에서는 발생 X)
  - [ ] API/DB 레벨에서도 차단

### BL-5: 잔액 != 0 계약 soft delete 차단 (BIZ-5, T-2)
- **출처**: §7.2 BIZ-5 + Part 4 T-2
- **유형**: E2E
- **사전 조건**: 활성 계좌, 잔액 ₩ 1,200,000.
- **테스트 단계**:
  1. `/msp/contracts/[id]` 진입 → 계약 삭제 버튼 클릭
  2. 삭제 모달 표시 → API 사전 체크 → 차단
  3. 모달 텍스트: "예치금 잔액이 ₩ 1,200,000 남아있습니다. 환불 후 삭제하세요"
  4. "예치금 탭으로 이동" CTA 클릭 → 예치금 탭으로 이동
  5. 환불 등록 (refund, ₩ 1,200,000) → 잔액 0
  6. 다시 계약 삭제 → 정상 삭제
- **검증 항목**:
  - [ ] API 단 사전 체크가 우선 (UX 친화)
  - [ ] DB 트리거 `guard_contract_delete_with_deposit`이 최종 안전망
  - [ ] 잔액 0이 된 후 정상 삭제 가능

### EF-2: 영업이 권한 없는 계약 접근 (RLS 차단)
- **출처**: §6.3 E2
- **유형**: E2E
- **사전 조건**: 영업 A 계정. 영업 B 담당 계약 URL.
- **테스트 단계**:
  1. 영업 A가 영업 B 담당 계약 URL 직접 진입
  2. RLS가 contracts SELECT 차단 → 페이지에서 권한 없음 안내
  - **단**: MSP 팀은 전체 가시 (PRD 결정 5-1) → 영업 A도 같은 MSP 팀이면 통과
  3. 비-MSP 팀(Education) 계정으로 시도 → 사이드바 메뉴 자체 미노출 + URL 직접 진입 시 차단
- **검증 항목**:
  - [ ] 비-MSP 팀: `/deposit` URL 진입 시 안내
  - [ ] 비-MSP 계약: 예치금 탭 미노출

### AS-2: 영업이 adjustment 시도 → 403
- **출처**: §7.3
- **유형**: API
- **사전 조건**: 영업 계정 (admin 아님).
- **테스트 단계**:
  1. 영업 계정으로 API 호출 (adjustment 트랜잭션 INSERT)
  2. RLS WITH CHECK 차단 → 403
  3. UI 단에서는 "잔액 보정" 버튼 자체가 미노출
- **검증 항목**:
  - [ ] 영업/사내담당 → 보정 버튼 안 보임
  - [ ] admin → 보정 버튼 보임 + 정상 동작
  - [ ] API 직접 호출도 403

### TG-1: 잔액 정합성 — 트리거와 calcBalance 거울 비교 (T-1)
- **출처**: Part 4 T-1
- **유형**: E2E + Component
- **사전 조건**: 다양한 트랜잭션 시드.
- **테스트 단계**:
  1. 활성 계좌에 deposit/usage/adjustment/refund 각 1건 + void 1건 등록
  2. DB의 `deposit_accounts.balance` 조회
  3. 클라이언트의 `calcBalanceFromTransactions()` (테스트용 유틸 — 트리거 식을 JS로 재구현) 결과 조회
  4. 두 값 비교
- **검증 항목**:
  - [ ] 두 값 일치 (1원도 차이 없음)
  - [ ] adjustment 음수 정상 반영
  - [ ] void된 트랜잭션은 양쪽 다 제외

### TG-3: TanStack Query invalidate 일관성 (T-3)
- **출처**: Part 4 T-3
- **유형**: Component
- **사전 조건**: 사이드바 + 대시보드 동시 마운트.
- **테스트 단계**:
  1. 대시보드에서 트랜잭션 등록 (deposit 또는 usage)
  2. mutation 완료 직후 사이드바 배지 카운트 즉시 갱신 확인
  3. void 시에도 동일 검증
- **검증 항목**:
  - [ ] `depositKeys.all` invalidate가 모든 관련 쿼리 트리거
  - [ ] 사이드바 + 대시보드 + 계약 상세 탭 모두 동기화

### EF-1: 동시 편집 (append-only로 자동 OK)
- **출처**: §6.3 E1
- **유형**: E2E
- **사전 조건**: 두 명의 영업이 같은 계좌에 동시 접근.
- **테스트 단계**:
  1. 영업 A 모달 오픈 + amount 입력 중
  2. 영업 B가 별도 트랜잭션 등록 완료
  3. 영업 A가 등록 클릭 → 정상 INSERT (append-only)
  4. 영업 A의 화면이 자동으로 영업 B의 입력 반영 (refetchOnWindowFocus)
- **검증 항목**:
  - [ ] 충돌 없음 (둘 다 등록 성공)
  - [ ] 잔액은 트리거가 자동 정합성 보장
  - [ ] TanStack Query invalidate로 양쪽 화면 갱신

---

## P1 테스트 (중요, 18개)

### AF-2: 무효화 후 재등록 (Should — FR-10)
- **출처**: §6.2 A2
- **유형**: E2E
- **사전 조건**: 활성 계좌, 트랜잭션 1건 존재.
- **테스트 단계**:
  1. 트랜잭션 행 "무효화" 클릭 → M5 모달
  2. void_reason "금액 100만원 → 120만원 오타" 입력 → 확인
  3. UI에 line-through + voided 배지
  4. 잔액 트리거 재계산
  5. 올바른 값으로 신규 트랜잭션 등록
- **검증 항목**:
  - [ ] void 트랜잭션은 다시 void 불가
  - [ ] 잔액이 void 전후로 정확히 변화

### AF-3: 환불 처리 (계약 종료, Must — FR-9 P0 승격)
- **출처**: §6.2 A3
- **유형**: E2E
- **우선순위 재조정**: P0 (FR-9 Must로 승격됨)
- **사전 조건**: 활성 계좌, 잔액 ₩ 5,000,000, 관리자 계정.
- **테스트 단계**:
  1. 계약 상세 예치금 탭 → "환불 등록" 클릭 (관리자만 보임)
  2. amount=5,000,000, memo "2026-12-31 계약 종료 환불" (5자 이상) 입력
  3. 등록 → 잔액 0
  4. 계약 삭제 시도 → 정상 진행 (BL-5 시나리오와 연계)
- **검증 항목**:
  - [ ] balance가 0이 됨 (total_usage는 변동 없음)
  - [ ] refund 행이 거래내역에 빨간색 "−" 표시

### EF-3: 네트워크 끊김 (모달 제출 중)
- **출처**: §6.3 E3
- **유형**: E2E
- **사전 조건**: 거래 등록 모달 작성 완료.
- **테스트 단계**:
  1. 등록 클릭 → 네트워크 차단 (Playwright route abort)
  2. 모달 내 Alert "응답 시간이 초과되었습니다. 다시 시도해주세요."
  3. 폼 데이터 유지, 등록 버튼 재활성
  4. 네트워크 복구 → 재시도 → 성공
- **Playwright 힌트**: `await page.route('**/deposit_transactions*', route => route.abort());`

### EF-4: DB 트리거 실패 (캐시 갱신 실패)
- **출처**: §6.3 E4
- **유형**: API
- **사전 조건**: 트리거 함수에 의도적 실패 주입 (테스트 환경).
- **테스트 단계**:
  1. INSERT 요청 → AFTER 트리거에서 예외
  2. 트랜잭션 BEGIN/COMMIT 롤백 → INSERT 자체 실패
  3. 클라이언트 500 응답 → Alert "등록 처리 중 오류"
- **검증 항목**:
  - [ ] DB 정합성 유지 (트랜잭션 INSERT도 롤백)
  - [ ] balance 캐시도 변경되지 않음

### VT-3~7: validation 한계값
- **출처**: §7.1
- **유형**: Component
- **케이스**:
  - VT-3: amount = 10_000_000_000 (99억 초과) → 에러 "금액이 너무 큽니다"
  - VT-4: txn_date = 오늘 + 31일 → 에러 "30일 이상 미래 날짜는 입력할 수 없습니다"
  - VT-5: txn_date = 2019-12-31 → 에러 "유효한 날짜를 입력하세요"
  - VT-6: memo = 201자 → 에러 "메모는 200자 이내"
  - VT-7: adjustment/refund/void에서 memo 4자 → 에러 "사유를 5자 이상"

### BL-3: 비-MSP 계약에 활성화 시도
- **출처**: §7.2 BIZ-3
- **유형**: API
- **테스트 단계**:
  1. Education 계약 ID로 deposit_accounts INSERT API 호출
  2. RLS WITH CHECK (contracts.type='msp') 차단 → 403/409
- **검증 항목**:
  - [ ] UI에서는 비-MSP 탭 미노출
  - [ ] API/DB 단 모두 차단

### BL-4: voided 트랜잭션 재 void 차단
- **출처**: §7.2 BIZ-4
- **유형**: E2E + API
- **테스트 단계**:
  1. void된 트랜잭션 행의 무효화 버튼 → 비활성화 상태
  2. API 직접 호출 (`voided_at IS NULL` 조건) → 0 rows affected → 409

### BL-6: 활성 트랜잭션 있는 계좌 비활성화 차단
- **출처**: §7.2 BIZ-6
- **유형**: E2E
- **테스트 단계**:
  1. 활성 트랜잭션 1건 있는 계좌에서 비활성화 시도
  2. 비활성화 버튼 disabled + tooltip "트랜잭션이 있는 계좌는 비활성화할 수 없습니다"
  3. void로 트랜잭션 무효화한 경우 비활성화 가능 여부 (PRD에서 voided_at IS NULL인 것만 0건 카운트)
- **검증 항목**:
  - [ ] 활성 트랜잭션 0건 + void 트랜잭션 있는 경우 → 비활성화 가능

### AS-1: 401 세션 만료
- **출처**: §7.3
- **유형**: E2E
- **테스트 단계**:
  1. 토큰 만료 상태 (Playwright `storageState` 만료 처리)
  2. 페이지 진입 → 자동 로그인 페이지 리디렉트

### AS-3: 409 중복 활성화/이미 void
- **출처**: §7.3
- **유형**: API
- **케이스**: BL-2, BL-4의 API 단 검증과 통합.

### AS-4: 500 서버 에러
- **출처**: §7.3
- **유형**: E2E
- **테스트 단계**:
  1. Supabase route 500 강제 응답 (Playwright `page.route`)
  2. 토스트 "일시적인 오류입니다. 잠시 후 다시 시도해주세요."

### AS-5: timeout 응답 지연
- **출처**: §7.3
- **유형**: E2E
- **테스트 단계**:
  1. 응답 지연 30초 (Playwright `page.route` with `setTimeout`)
  2. 클라이언트 timeout → 모달 Alert "응답 시간 초과"

### TG-2: 계약 삭제 차단 UX (= BL-5)
- BL-5와 동일. 별도 표기는 Pre-mortem T-2 매핑 차원.

### TG-4: 트리거 성능 (T-4)
- **출처**: Part 4 T-4
- **유형**: Performance
- **사전 조건**: 단일 계좌에 1,000건 트랜잭션 시드.
- **테스트 단계**:
  1. 1,001번째 트랜잭션 INSERT
  2. INSERT 응답 시간 측정 (목표 < 1초 — NF-2와 일치)
- **검증 항목**:
  - [ ] 부분 인덱스 (`WHERE voided_at IS NULL`) 활용 확인
  - [ ] EXPLAIN ANALYZE로 Seq Scan 없음

### TG-5: SECURITY DEFINER search_path (T-5)
- **출처**: Part 4 T-5
- **유형**: Migration + Security
- **검증 단계**:
  1. `\df+ recalc_deposit_account_balance` (psql)
  2. `Security: definer`, `Config: search_path=public` 출력 확인
  3. 마이그레이션 파일 grep `SET search_path = public` 존재 확인
- **검증 항목**:
  - [ ] 트리거 함수 + guard 함수 모두 명시

---

## P2 테스트 (권장, 16개)

### EC-1: 활성 계좌 트랜잭션 0건 1년 방치
- **출처**: §7.4 EC-1
- **유형**: Component
- **테스트 단계**: 시드로 active 1년 + txn 0건 상태 → 카드 Empty State 유지, alertLevel='ok'

### EC-2: 첫 트랜잭션이 usage (입금 없이 차감)
- **출처**: §7.4 EC-2
- **유형**: E2E
- **테스트 단계**: 활성화 직후 usage 등록 → balance 음수 + critical, total_deposit=0으로 balancePct=0

### EC-3: 동일 날짜 다수 트랜잭션
- **출처**: §7.4 EC-3
- **유형**: Component
- **테스트 단계**: 2026-05-15에 deposit 2건 + usage 1건 등록 → 거래내역에 순서대로 (created_at desc)

### EC-4: total_deposit=0 + balance>0 (adjustment로만 만든 잔액)
- **출처**: §7.4 EC-4
- **유형**: Component
- **테스트 단계**: 신규 계좌 → adjustment +100 → balance=100, total_deposit=0, balancePct=0

### EC-5: 트랜잭션 100건 이상
- **출처**: §7.4 EC-5
- **유형**: E2E
- **테스트 단계**: 100건 시드 → 페이지네이션 30건/page, 차트는 최근 30건만

### EC-6: USD 통화 계좌
- **출처**: §7.4 EC-6
- **유형**: E2E
- **사전 조건**: contract.currency='USD'인 계약 시드
- **검증 항목**: 카드/모달/거래내역 모두 $ 기호. KPI는 USD 줄에 합산.

### EC-7: 모달 작성 중 브라우저 뒤로가기
- **출처**: §7.4 EC-7
- **유형**: E2E
- **테스트 단계**: amount 입력 중 뒤로가기 → "변경사항이 저장되지 않습니다. 나가시겠습니까?" beforeunload

### EC-8: 200자 memo 표시 (말줄임)
- **출처**: §7.4 EC-8
- **유형**: Component
- **검증 항목**: 카드에는 1줄 truncate + hover/click 시 전체

### EC-9: 계약 soft delete 시 deposit_accounts 처리 → BL-5와 동일 (잔액 0이면 자동 처리 안 함, 그대로 유지)

### EC-10: 다중 탭 동시 편집
- **출처**: §7.4 EC-10
- **유형**: E2E
- **테스트 단계**: 두 탭에서 같은 계좌 → 한 탭에서 INSERT → 다른 탭 refetchOnWindowFocus

### NF-1: 메인 대시보드 TTI ≤ 3초 (계좌 30건)
- **출처**: §3 성능
- **유형**: Performance
- **사전 조건**: 30개 계좌 시드
- **측정**: Lighthouse 또는 Playwright `metrics()`로 TTI 측정

### NF-2: 트랜잭션 INSERT 응답 ≤ 1초
- **유형**: API/Performance
- **TG-4와 통합 가능**

### NF-3: 잔액 추이 차트 렌더링 ≤ 200ms (트랜잭션 100건 이하)
- **유형**: Component/Performance
- **사용 도구**: React Profiler API

### NF-4: WCAG 2.2 AA 자동 검사
- **유형**: A11y
- **도구**: `@axe-core/playwright`
- **검증 항목**:
  - [ ] 색상 대비 비율 (alertLevel 색상 vs 텍스트)
  - [ ] 배지 텍스트 + 아이콘 병기 (색상에만 의존 X)
  - [ ] screen reader용 aria-label

### NF-5: 모달 키보드 네비게이션
- **유형**: A11y
- **테스트 단계**: ESC 닫기, Tab focus trap, Enter 제출

### AF-1 추가: 영업이 본인 입력분 즉시 void (시간 제한 없음)
- **출처**: §6.2 A2 변형 + 4-2B 결정
- **유형**: E2E
- **사전 조건**: 영업이 입력한 트랜잭션 (1주일 전).
- **검증 항목**:
  - [ ] 본인 입력분이면 시간 무관 void 가능
  - [ ] 타인 입력분은 admin만 void

---

## Phase 7 Playwright 매핑

| 테스트 ID | 파일 경로 (권장) | 설명 |
|---|---|---|
| HP-1, HP-2 | `e2e/deposit/happy-path.spec.ts` | Primary Flow 등록→차감→확인 |
| AF-1, AF-2, AF-3 | `e2e/deposit/alternative.spec.ts` | 활성화, 무효화, 환불 |
| EF-1~4 | `e2e/deposit/error-flow.spec.ts` | 동시편집, 권한, 네트워크, 트리거 |
| VT-1~7 | `tests/components/deposit/validation.test.tsx` (Vitest) | 입력 검증 (Component) |
| BL-1~6 | `e2e/deposit/business-logic.spec.ts` | 비즈니스 룰 (음수/중복/삭제 차단 등) |
| AS-1~5 | `e2e/deposit/auth-system.spec.ts` | 401/403/409/500/timeout |
| EC-1~10 | `e2e/deposit/edge-cases.spec.ts` | 엣지케이스 |
| NF-1~3 | `tests/performance/deposit-perf.spec.ts` | 성능 측정 |
| NF-4, NF-5 | `e2e/deposit/a11y.spec.ts` | 접근성 (axe-core) |
| TG-1 | `tests/lib/deposit/balance-consistency.test.ts` (Vitest + Supabase) | 트리거 vs calcBalance 거울 비교 |
| TG-2 | BL-5와 통합 (`business-logic.spec.ts`) | |
| TG-3 | `tests/components/deposit/invalidate.test.tsx` | TanStack Query invalidate 일관성 |
| TG-4 | `tests/performance/trigger-perf.spec.ts` | 트리거 1000건 INSERT 성능 |
| TG-5 | `tests/migrations/security-definer.test.ts` (SQL grep) | search_path 명시 검증 |

---

## 실행 가이드

### 우선순위별 실행 순서

1. **Phase 5 Foundation 완료 후 즉시**: TG-5 (search_path) — 마이그레이션 후 SQL 검증
2. **Phase 6 구현 단계마다**: 관련 Vitest 단위/컴포넌트 테스트 (calcBalance VT-1~7, TG-3 invalidate)
3. **Phase 7 검증 루프**: P0 모두 → P1 → P2 순
4. **출시 전 최종**: NF-1~5 성능/접근성

### 시드 데이터 매핑

`supabase/seed/deposit-seed.sql` (Plan Task 5)이 3종 시나리오 제공:
- critical 시나리오 → BL-1, EC-1, HP-2 검증에 사용
- warning 시나리오 → HP-2 정렬 검증
- ok 시나리오 → HP-1, AF-1 베이스

### 인증 방식

`supabase/seed/create-test-users.sql` 6명 계정 활용 (MEMORY.md):
- admin 계정 → adjustment, refund 시나리오
- 영업 계정 (MSP 팀) → 일반 시나리오
- Education 팀 계정 → BL-3, EF-2 도메인 분리 검증

### Playwright `storageState`

테스트 시작 시 6명 각 계정으로 1회 로그인 → `auth-states/{role}.json` 저장 → 각 spec에서 재활용. 토큰 만료 시뮬레이션은 별도 fixture.

---

## 종합

- **총 케이스: 47개** (P0 13 / P1 18 / P2 16)
- **커버리지: 38/38 spec 항목 (100%)**
- **TDD 적용**: VT-1~7, TG-1, TG-3 (Vitest 단위/컴포넌트). Phase 6 구현 시 Red-Green-Refactor.
- **E2E 적용**: HP/AF/EF/BL/AS/EC (Phase 7 Playwright).
- **성능/접근성**: NF-1~5 (출시 전 최종 검증).

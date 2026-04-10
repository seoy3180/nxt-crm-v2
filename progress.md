# Progress (2026-04-09)

## 완료
- Foundation 전체 (Plan 1) — 17개 Task
- 고객 CRUD (Plan 2A) — 8개 Task
- 계약 CRUD (Plan 2B) — 8개 Task
- UI 업그레이드 (feat/ui-upgrade) — pen 디자인 맞춤
- Plan 2C (feat/plan-2c)
  - 글로벌 검색 (Cmd+K) — 고객/연락처/계약 통합 검색
  - 대시보드 고도화 — KPI, 월별 매출 차트, 파이프라인, 팀별 매출, 최근 활동
  - MSP 섹션 전체
    - 대시보드 (KPI + 차트 + 등급분포 + 파이프라인 + 빠른작업 + 최근활동)
    - 고객 (인라인 편집 A안: 셀 클릭 편집 + 변경 추적 + 일괄 저장)
    - 계약 (칸반/테이블 토글 + URL 상태 유지 + 검색)
    - 연락처 (통합 검색 + 연락처 추가 모달)
    - 전용 등록 페이지 (고객/계약 — 사이드바 컨텍스트 유지)
  - 고객 등록 폼 동적 확장 (비즈니스 타입별 MSP/교육 상세 필드)
  - 편집 모드 전역 Context (사이드바 네비게이션 차단)
  - 목록 화면 레이아웃 통일 ([필터] ── [검색] [액션])
  - 공용 컴포넌트 (KpiCard, formatRevenue, formatTimeAgo, ContractStageFilter/Search)
  - DB: industry_type/company_size_type enum, education_operation_dates 테이블
  - DB 보안 경고 전부 해결
  - 코드 리뷰 4회 + UI/UX 리뷰 1회 반영
  - 테스트 101개 PASS (14파일)

## 진행 중
- feat/plan-2c 브랜치

## 다음 작업 (우선순위)
1. **MSP 계약 테이블 컬럼 설정 + 편집 모드** — /msp/contracts?view=table
2. **EDU 섹션** — /edu/dashboard, /edu/contracts, /edu/operations
3. **매출 분석** — /revenue, /revenue/by-team
4. **P2 리뷰 항목** — 반응형, 금액 포맷팅 등

## 이슈 / 블로커
- 교육 계약 상세 필드 확인 필요 (휘원님)
- 통합 등급 산정 기준 미확정 (진성님)
- contract_tt_details 테이블 삭제 필요 (쿼리 제공 완료)
- 신규 고객 KPI 집계 로직 미구현

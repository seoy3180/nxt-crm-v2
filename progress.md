# Progress (2026-04-08)

## 완료
- Foundation 전체 (Plan 1) — 17개 Task
  - Next.js 15 + TS strict + Tailwind 4 + Vitest
  - shadcn/ui 19개 컴포넌트
  - DB 스키마 15개 테이블 + RLS 17개 마이그레이션
  - 인증 (Supabase Auth + AuthProvider + RBAC + Guard)
  - 사이드바 + 공통 컴포넌트 + 로그인/대시보드/프로필 페이지
  - Supabase 프로젝트 연결 + 테스트 사용자 6명 + 더미 시드
- 고객 CRUD (Plan 2A) — 8개 Task
- 계약 CRUD (Plan 2B) — 8개 Task
- UI 업그레이드 (feat/ui-upgrade)
  - pen 디자인 기준 전체 화면 UI 맞춤
  - 사이드바, 로그인, 대시보드, 고객 CRUD, 계약 CRUD, 프로필
  - 칸반 DnD, 교육 운영 아코디언 + 일자별 시간 입력
  - Combobox 고객/상위고객 검색, 새 고객/연락처 인라인 생성
  - 계약 상세 pen 스타일, MSP 카드, 삭제 영역 하단 고정
  - DB: client_list_view, education_operation_dates 테이블, notes 컬럼
- Plan 2C 일부 (feat/plan-2c)
  - 글로벌 검색 (Cmd+K) — 고객/연락처/계약 통합 검색
  - 대시보드 고도화 — KPI 실 데이터, 월별 매출 차트, 파이프라인, 팀별 매출, 최근 활동
  - 코드 리뷰 + UI/UX 리뷰 P0/P1 전부 반영

## 테스트 현황
- 5개 파일, 47개 테스트 전부 PASS
- 코드 리뷰 2회 + UI/UX 리뷰 1회 완료

## 진행 중
- feat/plan-2c 브랜치

## 다음 작업 (우선순위)
1. **MSP 섹션** — /msp/dashboard, /msp/clients, /msp/contracts, /msp/contacts
2. **EDU 섹션** — /edu/dashboard, /edu/contracts, /edu/operations
3. **매출 분석** — /revenue, /revenue/by-team
4. **P2 리뷰 항목** — 반응형, 금액 포맷팅, 필터 높이 통일 등

## 이슈 / 블로커
- 교육 계약 상세 필드 확인 필요 (휘원님)
- 통합 등급 산정 기준 미확정 (진성님)
- 고객-계약 M:N 전환 시점 미확정
- contract_tt_details 테이블 삭제 필요 (쿼리 제공 완료, 사용자 실행 대기)
- 신규 고객 KPI: 이번 달 신규 고객 집계 로직 미구현

# Progress (2026-04-09)

## 완료
- Foundation 전체 (Plan 1) — 17개 Task
- 고객 CRUD (Plan 2A) — 8개 Task
- 계약 CRUD (Plan 2B) — 8개 Task
- UI 업그레이드 (feat/ui-upgrade) — pen 디자인 맞춤
- Plan 2C (feat/plan-2c)
  - 글로벌 검색 (Cmd+K) — 고객/연락처/계약/AWS 계정 ID 통합 검색
  - 대시보드 고도화 — KPI, 월별 매출 차트, 파이프라인, 팀별 매출, 최근 활동
  - MSP 섹션 전체 (FR-020~026, FR-050~054)
    - 대시보드 (KPI + 차트 + 등급분포 + 파이프라인 + 빠른작업 + 최근활동)
    - 고객 (인라인 편집 + 컬럼 설정 DnD + user_preferences 영구 저장)
    - 계약 (칸반/테이블 토글 + 인라인 편집 + 컬럼 설정 + 변경이력)
    - 연락처 (서버 검색 + 페이지네이션 + 인라인 편집 + 컬럼 설정)
    - 계약 상세 (수정/저장/취소 + 매출 배분 RPC 트랜잭션 + 변경이력)
    - MSP 정보 탭 (등급, AWS AM, 산업/규모, AWS 계정 ID 태그, 태그 추천, 메모)
    - 전용 등록/상세 페이지 (사이드바 컨텍스트 유지)
  - 고객 등록 폼 동적 확장 (비즈니스 타입별 MSP/교육 상세 필드)
  - 편집 모드 전역 Context (사이드바 네비게이션 차단)
  - 목록 화면 레이아웃 통일 ([필터] ── [검색] [액션])
  - 공용 컴포넌트/훅 (useInlineEdit, ColumnSettings, KpiCard, getStageColor, getErrorMessage, safeNumber, formatAmount)
  - DB: employees 테이블, contract_msp_details enum 변경, 범용 변경이력, update_contract_teams RPC
  - DB 보안 경고 전부 해결
  - 서비스 평가 (5관점 75/100 B등급) + 개선 8항목 반영
- 매출 분석 (feat/revenue-analysis)
  - 연간 현황 — Recharts 월별 막대 차트 + 타입 필터 + 전년 비교 겹침 + 분기별 합계 카드
  - 팀별 분석 — 팀별 막대 차트 + 순위 테이블 + 미배분 표시 + 분기 필터
  - 역할별 접근 제한 (staff 차단, team_lead 소속 팀, admin/c_level 전사)

## 다음 작업 (우선순위)
1. **EDU 섹션** — /edu/dashboard, /edu/contracts, /edu/operations
2. **P2 리뷰 항목** — 반응형, 접근성 등
3. **역할별 맞춤 대시보드** (FR-070)

## 이슈 / 블로커
- 매출 인식 기준 확인 필요 (진성님) — 생성일 vs 단계 vs 별도 필드
- MSP MRR 월별 분할 여부 (진성님)
- 교육 매출 시점 (진성님)
- 통합 등급 산정 기준 미확정 (진성님)

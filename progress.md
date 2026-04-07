# Progress (2026-04-07)

## 완료
- Foundation 전체 (Plan 1) — 17개 Task
  - Next.js 15 + TS strict + Tailwind 4 + Vitest
  - shadcn/ui 19개 컴포넌트
  - DB 스키마 15개 테이블 + RLS 17개 마이그레이션
  - 인증 (Supabase Auth + AuthProvider + RBAC + Guard)
  - 사이드바 + 공통 컴포넌트 + 로그인/대시보드/프로필 페이지
  - Supabase 프로젝트 연결 + 테스트 사용자 6명 + 더미 시드
- 고객 CRUD (Plan 2A) — 8개 Task
  - Zod 스키마 + 서비스 레이어 + React Query 훅
  - 목록 (트리뷰 + 필터 + 페이지네이션)
  - 등록 (폼 + 자동 ID + 상위 고객)
  - 상세 (탭: 기본정보 뷰/편집, 연락처 CRUD, MSP/교육 스텁, 관련 계약)
  - 삭제 (위험 영역 + 확인 다이얼로그)
- 계약 CRUD (Plan 2B) — 8개 Task
  - Zod 스키마 + 서비스 레이어 + React Query 훅
  - 목록 (비즈니스 탭 MSP/교육/개발 + 테이블 + 필터)
  - 등록 (공통 + MSP 확장 + 교육 운영 동적 추가)
  - 상세 (2열 레이아웃 + 단계 변경 + 이력 타임라인 + MSP/교육 카드)
  - 삭제 (정산 완료 불가 + 툴팁)
  - 고객 상세 관련 계약 탭 연결

## 테스트 현황
- 5개 파일, 47개 테스트 전부 PASS
- constants, client-validators, contract-validators, permissions, validators

## 진행 중
- (없음 — 다음 세션 대기)

## 다음 작업 (우선순위)
1. **pen 디자인 맞추기** — 기존 9개 페이지를 ui_design.pen에 맞춰 수정
   - 로그인 → 고객 목록 → 고객 상세 → 계약 목록 → 계약 상세 → 등록 폼
2. **누락 기능 추가** (Plan 2C)
   - 칸반 뷰 (MSP 4단계 / 교육 5단계, dnd-kit)
   - MSP 섹션 (/msp/dashboard, clients, contracts, contacts)
   - EDU 섹션 (/edu/dashboard, clients, contracts)
   - 매출 분석 (/revenue)
   - 글로벌 검색 (Cmd+K)
   - 인라인 편집 모드 (useInlineEdit)
   - 매출 배분 UI
   - 대시보드 위젯
   - 프로필 비밀번호 변경

## 이슈 / 블로커
- 서브에이전트 Write 권한 문제 반복 — UI 컴포넌트는 리드가 직접 작성하는 게 빠름
- Supabase MCP execute_sql 권한 문제 — CLI(`npx supabase db query --linked`)로 대체 가능
- output:export 비활성화됨 — 동적 라우트 때문, 배포 시 S3 대신 ECS/Lambda 필요

# Plan (2026-04-07)

## 목표
NXT CRM v1을 동일 기능 범위로 재구축 (v2). 구조/품질 근본 개선.

## 접근 방식
Phase 0(브레인스토밍) → Phase 1(기획/PRD) → Phase 2(기획 검증) → Phase 2.5(리스크) → Phase 3(UI 설계) → Phase 4(구현 계획) → Phase 5(Foundation) → Phase 6(개발) → Phase 7(검증) → Phase 8(기록)

## 작업 항목
- [x] Phase 1: PRD 작성 — `docs/prd.md`
- [x] Phase 2: /spec-review로 PRD 검증
- [x] Phase 2.5: /pre-mortem 리스크 분석
- [x] Phase 3: UI 설계 (Pencil MCP) — `ui_design.pen` 34개 화면
- [x] Phase 4: 구현 계획 — Plan 1(Foundation), Plan 2A(고객 CRUD), Plan 2B(계약 CRUD)
- [x] Phase 5: Foundation — 프로젝트 셋업, DB 스키마 17개 마이그레이션, RLS, 인증, 사이드바, 공통 컴포넌트
- [x] Phase 6: 병렬 개발 — 고객/계약 CRUD, pen UI 맞춤, Plan 2C 일부 완료
- [ ] Phase 7: 검증 루프
- [ ] Phase 8: 문서화

## 구현 계획 문서
- `docs/superpowers/plans/2026-04-06-foundation.md` — Foundation (완료)
- `docs/superpowers/plans/2026-04-07-client-crud.md` — 고객 CRUD (완료)
- `docs/superpowers/plans/2026-04-07-contract-crud.md` — 계약 CRUD (완료)
- Plan 2C (진행 중) — ~~글로벌 검색~~, ~~대시보드 고도화~~, ~~MSP 섹션~~, 인라인 편집, EDU 섹션, 매출 분석

## 결정사항
- DB 통합 모델: contracts + contract_msp_details + contract_tt_details
- 등급 3종: 통합(A~E), MSP(None/FREE/MSP10~), 교육(A~F)
- 강사: instructors 마스터 + operation_instructors 조인 (급여 제외, tt_team 관리)
- 고객-계약: 1:N 유지, M:N은 NXT DB 통합 시 전환
- RLS: public 스키마 함수 기반 팀 격리
- CSR: output:export 비활성화 (동적 라우트 호환), 배포 시 ECS/Lambda
- 테스트 사용자 6명 (GoTrue Admin API로 생성)

## 미결사항
- PRD `docs/prd.md` 하단 `## 미결 사항` 참조 (12건+)
- 통합 등급 산정 기준 (진성님)
- 교육 등급 산정 기준 (교육팀장님)
- 노션 MSP DB 매핑 모호 필드 (동식님)
- 고객-계약 M:N 전환 시점
- 교육 계약 상세 필드 확인 (휘원님) — 현재 교육 계약은 운영을 묶어주는 역할로, 계약단에서는 기본사항(계약명, 고객, 금액, 통화, 단계, 사내담당자, 고객사담당자, 설명)만 수집. 운영 외에 계약단에서 추가로 필요한 정보가 있는지 확인 필요

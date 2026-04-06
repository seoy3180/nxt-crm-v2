# Memory (2026-03-25)

## 프로젝트 컨텍스트
- 기존 CRM v1 경로: `/Users/ksy/nxt_crm/`
- 신규 CRM v2 경로: `/Users/ksy/nxt_crm_v2/`
- PRD: `docs/prd.md`

## 주요 결정사항
- Phase 1(PRD) 완료. 다음은 Phase 2(/spec-review) 진행.
- FR 29개 정의 (Must 11, Should 16, Could 2)
- 3단계 릴리즈: Foundation+Core → Pipeline+Analysis → Polish+QA

## 주의사항
- DB 스키마 통합 모델 vs 분리 모델 미결정
- v1 코드에 `as unknown as` 패턴 다수 — v2에서 생성 타입으로 제거
- v1 RLS 모두 `USING (true)` — v2에서 역할별 세분화 필수

## 참고
- v1 서비스 파일 9개: clients, contracts, education-contracts, msp, revenue, dashboard, search, operations, preferences
- v1 React Query hooks 14개
- v1 가장 큰 컴포넌트: msp-table.tsx (266줄)

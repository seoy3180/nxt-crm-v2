# Plan (2026-03-25)

## 목표
NXT CRM v1을 동일 기능 범위로 재구축 (v2). 구조/품질 근본 개선.

## 접근 방식
Phase 0(브레인스토밍) → Phase 1(기획/PRD) → Phase 2(기획 검증) → ... → Phase 8(기록)

## 작업 항목
- [x] Phase 1: PRD 작성 — `docs/prd.md` 완료
- [ ] Phase 2: /spec-review로 PRD 검증
- [ ] Phase 2.5: /pre-mortem 리스크 분석
- [ ] Phase 3: UI 설계 (Pencil MCP)
- [ ] Phase 4: 구현 계획 (writing-plans)
- [ ] Phase 5: Foundation (프레임워크, DB, 인증)
- [ ] Phase 6: 병렬 개발
- [ ] Phase 7: 검증 루프
- [ ] Phase 8: 문서화

## 결정사항
- v1 5개 도메인 기능 범위 동일 유지
- 기술 스택 동일 (Next.js 15, Supabase, shadcn/ui 등)
- 개선 핵심: 테스트(80%), RLS 강화, 타입 안전성, 페이지네이션, 에러 처리 표준화

## 메모
- v2 마이그레이션 스키마(customers/deals 통합모델)와 v1 서비스 코드(분리모델) 간 불일치 — OPEN ITEM
- Slack 통합 범위 미결정
- operations/tasks 모델 차이 — OPEN ITEM

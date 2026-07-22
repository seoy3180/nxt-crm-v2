# CRM 데이터 이전 및 신규 구조 전환 보고

작성일: 2026-07-01  
공유 대상: MSP 팀  
목적: Supabase -> ClickHouse-managed Postgres 동기화 현황 및 신규 CRM 전환 방향 공유

---

## 1. 핵심 결론

**단기: Supabase 운영 유지 + ClickHouse-managed Postgres mirror DB 확보**  
**장기: Next.js 풀스택 구조 기반 신규 CRM 전환**

| 근거 | 핵심 메시지 |
|---|---|
| 운영 리스크 | Supabase 무료 플랜의 관리형 백업/PITR 제약 -> ClickHouse-managed Postgres mirror DB 필요 |
| 구조 리스크 | Supabase가 인증, 권한, RPC, 트리거, 예치금 계산까지 담당 -> 단순 DB 교체 불가 |
| 기술 검증 | Amplify + Next.js route handler + ClickHouse-managed Postgres + RLS 세션주입 구조를 실제 CRM 스키마 기준으로 검증 완료 |

현재 운영 원칙:

- 기존 CRM: 신규 CRM 전환 완료 전까지 Supabase 기반 운영 유지
- `nxt_crm`: Supabase 데이터를 따라오는 mirror DB, 보호 대상
- `nxt_crm_dev`: 신규 CRM 개발 및 테스트 전용 DB
- 기존 CRM 기능 개발: 기존 repo에서 계속 진행
- 신규 CRM 반영: 이후 새 API/화면 구조에 맞춰 재반영

---

## 2. 현황 및 판단

### 2.1 현재 상황

현재 CRM의 Supabase 역할:

- DB 저장소
- 사용자 인증
- 사용자/팀별 데이터 접근 제어
- RLS(Row Level Security)
- 계약/고객사 접근 권한 판단
- RPC 기반 업무 처리
- 트리거 기반 예치금 계산
- soft delete 및 이력 관리

### 2.2 핵심 문제

| 문제 | 내용 |
|---|---|
| 운영 복구 문제 | Supabase 무료 플랜의 관리형 백업/PITR 제약 |
| 구조 전환 문제 | Supabase 백엔드 역할을 앱/서버/DB 레이어로 이관 필요 |

### 2.3 판단 기준

- 운영 중인 CRM 데이터 보호
- Supabase 의존 축소
- 신규 CRM 구조의 운영 가능성
- 기존 CRM 기능 개발 지속 가능성

### 2.4 실행 방향

| Track | 목적 | 현재 상태 |
|---|---|---|
| 단기 Track | Supabase 운영 유지 + ClickHouse-managed Postgres mirror DB 확보 | subscription 생성 및 기본 상태 확인 완료 |
| 장기 Track | Supabase 백엔드 의존 제거 + Next.js 풀스택 CRM 구축 | 실제 CRM 스키마/RLS 검증 완료, Cognito 인증 연동 예정 |

---

## 3. 단기 Track: Supabase -> ClickHouse-managed Postgres mirror

### 3.1 목적

- Supabase 무료 플랜의 복구 한계 보완
- 운영 데이터 보조 복제본 확보
- 향후 운영 DB 전환 준비

```text
기존 운영 CRM
  -> Supabase Auth / RLS / RPC / Postgres

보조 복제 경로
  Supabase Postgres
    -> logical replication
    -> ClickHouse-managed Postgres: nxt_crm
```

### 3.2 DB별 역할

| DB | 역할 | 운영 원칙 |
|---|---|---|
| Supabase Postgres | 현재 운영 원장 | 기존 CRM 운영 계속 담당 |
| `nxt_crm` | Supabase mirror DB | 개발 write, schema reset, seed 금지 |
| `nxt_crm_dev` | 신규 CRM 개발 DB | Next.js 풀스택 개발/검증 대상 |

핵심 원칙:

- `nxt_crm`과 `nxt_crm_dev` 구분 필수
- `nxt_crm` 직접 수정 금지
- 개발/테스트는 `nxt_crm_dev` 기준

### 3.3 진행 현황

| 항목 | 상태 |
|---|---|
| Supabase direct connection 방식 확인 | 완료 |
| Supabase direct endpoint IPv6-only 확인 | 완료 |
| local Mac/Docker direct dump 어려움 확인 | 완료 |
| target schema 선적용 필요 확인 | 완료 |
| ClickHouse-managed Postgres target schema 적용 | 완료 |
| subscription 생성 | 완료 |
| subscription 기본 상태 확인 | 완료 |
| 운영 수준 데이터 검증/모니터링 기준 정리 | 진행 |

### 3.4 복구 관점

`nxt_crm`의 역할:

- 전환 준비용 mirror DB
- Supabase 장애/데이터 손실 리스크 보완용 보조 복제본
- 향후 신규 CRM 운영 DB 후보

ClickHouse-managed Postgres 백업/PITR 공식 제공 사항:

| 항목 | 내용 |
|---|---|
| 자동 백업 | 매일 full backup |
| WAL archive | 60초마다 또는 16MB 누적 시 archive |
| PITR | retention window 안에서 특정 시점 복구 가능 |
| 기본 retention | 7일 |
| restore 방식 | 기존 instance 변경이 아니라 새 instance 생성 |

주의 사항:

- Supabase의 잘못된 수정/삭제가 mirror에도 반영될 수 있음
- PITR은 새 instance 생성 방식
- restore 이후 운영 instance 전환 절차 필요
- 실제 장애 대응 전 restore 리허설 필요

---

## 4. 장기 Track: Next.js 풀스택 신규 CRM

### 4.1 목표 구조

Supabase가 맡던 인증/권한/API/DB 접근 역할의 신규 앱 구조 이관

```text
Browser
  -> AWS Amplify Hosting
    -> Next.js App Router / Route Handler
      -> pg
        -> ClickHouse-managed Postgres
```

구조 원칙:

- 브라우저 직접 DB 접근 금지
- Next.js 서버 코드에서 API 역할 수행
- DB 접근은 서버에서만 처리
- 인증은 Cognito 전환 예정
- 권한은 기존 RLS 모델 유지

### 4.2 신규 repo 구조

```text
~/nxt-crm/
├── apps/
│   ├── web/          # Next.js 풀스택 앱, Amplify 배포 대상
│   └── be/           # fallback BE 또는 DB PoC 자산 보관
├── packages/
│   └── shared/       # 공통 타입
├── turbo.json
├── pnpm-workspace.yaml
└── amplify.yml
```

현재 기준:

- 1차 runtime: `apps/web`
- `apps/be`: fallback BE 또는 DB PoC 자산 보관
- Amplify SSR 제약 발생 시 별도 BE 승격 가능

### 4.3 Next.js 풀스택 우선 사유

| 판단 기준 | 결론 |
|---|---|
| 개발 복잡도 | 별도 BE 선구축 시 인증, CORS, API 계약, 배포 복잡도 증가 |
| 현재 CRM 구조 | Next.js 중심 구조로 전환 비용 상대적으로 낮음 |
| 검증 결과 | Amplify SSR에서 DB 접속과 RLS 세션주입 동작 확인 |
| 확장성 | 필요 시 `apps/be` 별도 BE 승격 가능 |

---

## 5. 권한 구조 전환 방향

### 5.1 핵심 원칙

- 행 단위 권한 판단: DB RLS 또는 서버 API 담당
- FE 권한 로직 재구현 금지
- FE 역할: API 응답의 권한 플래그 기반 표시 제어
- 예시 플래그: `canEdit`, `canManage`, `canDelete`

### 5.2 사용자 식별 방식 변경

```text
기존 방식
Supabase Auth
  -> auth.uid()
  -> RLS 정책에서 현재 사용자 판단

신규 방식
Cognito 로그인
  -> Cognito sub 확인
  -> profiles.id로 매핑
  -> DB transaction에 current_user_id 주입
  -> RLS 정책에서 현재 사용자 판단
```

### 5.3 검증 결과

- 사용자 A: A팀 데이터만 조회 가능
- 사용자 B: B팀 데이터만 조회 가능
- 사용자 A의 B팀 데이터 수정 차단
- 사용자 정보 미주입 시 기본 조회 차단
- connection pool 재사용 시 이전 사용자 정보 누수 없음

---

## 6. 진행 단계

| 단계 | 상태 | 설명 |
|---|---|---|
| P0 | 완료 | 운영 DB schema 정합성 확인 |
| P1 | 완료 | Supabase 의존성, RPC, RLS, Auth 전수조사 |
| P2 | 완료 | RLS 세션주입 PoC 통과 |
| P3 | 완료 | Amplify Next.js 풀스택 + DB 접속 검증 |
| P4 | 완료 | `nxt_crm_dev`에 실제 CRM schema/RLS 이전 및 smoke 검증 |
| P5 | 다음 단계 | Cognito 인증 연동 |
| P6 | 예정 | 실제 로그인 사용자 기준 RLS 자동검증 |
| P7 | 예정 | 고객사/계약/예치금/교육 API 이관 |
| P8 | 예정 | 화면 이식 및 권한 UI 연결 |
| P9 | 예정 | 운영 사용자 이관 및 신규 CRM 운영 전환 |
| P10 | 후속 | ClickHouse OLAP 분석 파이프라인 |

---

## 7. 완료된 검증

### 7.1 P2: RLS 세션주입 검증

| 검증 항목 | 결과 |
|---|---|
| local Postgres 기준 RLS 검증 | 통과 |
| ClickHouse-managed Postgres 기준 RLS 검증 | 통과 |
| 비특권 app role 생성 | 통과 |
| PgBouncer transaction-mode에서 `SET LOCAL` 동작 | 통과 |
| 사용자 A/B 데이터 격리 | 통과 |

### 7.2 P3: Amplify SSR 검증

| 검증 항목 | 결과 |
|---|---|
| `/api/health` | 통과 |
| `/api/db-ping` | 통과 |
| `/api/widgets` | 통과 |
| Amplify SSR route handler에서 DB 접속 | 통과 |
| RLS 세션주입이 배포 환경에서 동작 | 통과 |

배포 URL:

```text
https://main.d1tvtuc4dsin9x.amplifyapp.com/
```

### 7.3 P4: 실제 CRM schema/RLS 검증

| 검증 항목 | 결과 |
|---|---|
| public CRM table 20개 적용 | 완료 |
| RLS enabled table 20개 확인 | 완료 |
| RLS policy 62개 적용 | 완료 |
| Supabase `auth.users` FK 제거 | 완료 |
| `auth.uid()` 의존 제거 | 완료 |
| smoke API 검증 | 완료 |

---

## 8. 다음 단계

### 8.1 우선순위 1: mirror DB 신뢰도 확인

- [ ] Supabase와 `nxt_crm` 주요 테이블 count 비교
- [ ] Supabase test insert/update/delete 후 `nxt_crm` 반영 확인
- [ ] subscription 지연/중단 모니터링 기준 정리
- [ ] ClickHouse-managed Postgres PITR restore 리허설
- [ ] restore 후 운영 전환 runbook 작성
- [ ] 노출 가능성이 있었던 DB 비밀번호 rotation 여부 결정

### 8.2 우선순위 2: Cognito 인증 전환

- [ ] Cognito User Pool 생성
- [ ] App Client 생성
- [ ] Hosted UI domain 설정
- [ ] callback/logout URL 등록
- [ ] access token JWT 검증 구현
- [ ] `profiles.cognito_sub` 컬럼 추가
- [ ] 테스트 사용자 2명 매핑
- [ ] `/api/auth/me` 구현
- [ ] 기존 smoke API에서 개발용 header 제거
- [ ] 로그인 사용자 기준 RLS 격리 확인

### 8.3 우선순위 3: 도메인 API 이관 준비

- [ ] clients API 이관 범위 정의
- [ ] contracts API 이관 범위 정의
- [ ] deposit API 이관 범위 정의
- [ ] education API 이관 범위 정의
- [ ] API 응답에 권한 플래그 포함 기준 정리

---

## 9. MSP 팀 확인 요청

| 확인 항목 | 요청 사항 |
|---|---|
| mirror DB 보호 | `nxt_crm`은 Supabase sync 대상이므로 개발용 직접 수정 금지 |
| 개발 DB 사용 | 신규 CRM 개발과 테스트는 `nxt_crm_dev` 기준 |
| 기존 CRM 기능 개발 | 신규 CRM 전환 완료 전까지 기존 CRM repo에서 계속 진행 |
| 신규 CRM 반영 | 기존 CRM 추가 기능은 이후 새 API/화면 구조에 맞춰 재반영 |
| DB schema 변경 | 기존 운영 DB와 신규 개발 DB 양쪽 영향 확인 후 진행 |
| 권한 관련 기능 | FE 단독 구현 금지, 서버/DB 권한 기준 먼저 확정 |

---

## 10. 주요 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| `nxt_crm` mirror DB를 개발용으로 수정 | Supabase sync 대상 오염 | 개발은 반드시 `nxt_crm_dev`에서 진행 |
| subscription 상태 오판 | mirror DB 최신성 불확실 | count 비교, 변경 이벤트 반영 테스트 |
| mirror DB만으로 장애 대응 자동 완결 가정 | PITR은 새 instance 생성 방식으로 전환 절차 필요 | restore 리허설과 전환 runbook 작성 |
| DB 비밀번호 노출 | 보안 위험 | rotation 여부 결정 |
| runtime에서 admin DB role 사용 | RLS 우회 위험 | runtime은 `nxt_crm_app`만 사용 |
| Cognito sub와 `profiles.id` 혼동 | 권한/RLS 오류 | `sub -> profiles.id -> RLS 주입` 순서 유지 |
| FE 권한 로직 중복 | 권한 drift 발생 | 서버 응답의 권한 플래그만 사용 |
| route handler에 장시간 작업 포함 | timeout/운영 불안정 | batch/migration/CDC 운영은 별도 script/job 분리 |

---

## 11. 참고

- Supabase Backups: https://supabase.com/docs/guides/platform/backups
- ClickHouse Managed Postgres Backup and restore: https://clickhouse.com/docs/cloud/managed-postgres/backup-and-restore

---

## 12. 최종 메시지

이번 작업의 성격:

- 단순 DB 교체가 아닌 백엔드 구조 전환
- Supabase의 인증/권한/API/DB 로직 역할 이관
- 운영 안정성을 위한 `nxt_crm` mirror DB 보호
- 신규 개발을 위한 `nxt_crm_dev` 기준 검증 지속

현재 결론:

**AWS Amplify + Next.js route handler + ClickHouse-managed Postgres + RLS 세션주입 구조는 기술적으로 가능**  
**다음 핵심 관문은 Cognito 인증 전환**

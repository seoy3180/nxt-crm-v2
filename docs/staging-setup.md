# Staging 환경 운영 가이드

> 작성: 2026-05-15
> 운영-Staging 분리 셋업 완료 시점

## 환경 구조

```
┌───────────────────────────────────────────────────────────────┐
│ Production                                                    │
│   Vercel: main 브랜치 → 자동 배포                              │
│   URL: yourservice.com (또는 Vercel Production URL)           │
│   DB: https://ghuevnxgcdltgupoddsn.supabase.co               │
│   환경 변수: Vercel → Production 환경                          │
│   👥 실제 사용자, 실 데이터                                    │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ Staging (Preview)                                             │
│   Vercel: staging 브랜치 → 자동 Preview 배포                   │
│   URL: nxt-crm-v2-git-staging-seoy3180s-projects.vercel.app  │
│   DB: https://afydtaxmuwjdhmdwgemy.supabase.co               │
│   환경 변수: Vercel → Preview + Development 환경               │
│   🧪 동식님/팀 검토, 시드 데이터 (3 시나리오)                  │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│ Local                                                         │
│   .env.local: 사용자 선택 (보통 staging)                       │
│   .env.staging: staging DB 연결 (npm run dev:staging)          │
│   .env.prod: production DB 연결 (npm run dev:prod ⚠️)          │
│   🔧 개발자 작업 환경                                          │
└───────────────────────────────────────────────────────────────┘
```

## 표준 배포 흐름

### 일반 기능 개발
```bash
# 1. 로컬 개발 (staging DB 연결)
cd /Users/ksy/nxt_crm_v2
npm run dev:staging       # localhost:3000 (staging)

# 2. 변경 사항 commit
git checkout staging      # staging 브랜치에서 작업
git add .
git commit -m "feat: 새 기능"

# 3. push → Vercel 자동 Preview 배포
git push origin staging
# → https://nxt-crm-v2-git-staging-seoy3180s-projects.vercel.app

# 4. 동식님/팀 검토 후 OK 받으면
git checkout main
git merge staging
git push origin main      # → Production 자동 배포
```

### DB 스키마 변경 (마이그레이션)

```
순서가 중요: DB 변경 먼저 → 코드 배포 그 다음
```

```bash
# 1. 마이그레이션 SQL 파일 작성
# supabase/migrations/000XX_add_xxx.sql

# 2. Staging DB에 먼저 적용
# https://supabase.com/dashboard/project/afydtaxmuwjdhmdwgemy/sql/new
# → SQL 붙여넣고 Run

# 3. 타입 재생성 + 코드 작성
npx supabase gen types typescript --project-id afydtaxmuwjdhmdwgemy > src/lib/supabase/types.ts

# 4. staging 브랜치에 push → Preview 검증
git push origin staging

# 5. ⚠️ Production DB에 같은 SQL 적용 (코드 배포 전!)
# https://supabase.com/dashboard/project/ghuevnxgcdltgupoddsn/sql/new

# 6. main으로 merge → Production 코드 배포
git checkout main && git merge staging && git push origin main
```

**위험한 변경 (DROP COLUMN, 이름 변경 등)**: 다단계 배포 권장
- A: 새 컬럼 추가 (이전 컬럼 보존)
- B: 코드를 새 컬럼 사용으로 전환
- C: 이전 컬럼 DROP

## 핵심 파일

### Supabase 마이그레이션
- `supabase/migrations/00001~00024_*.sql` — 운영 schema 마이그레이션 (운영은 자동 적용됨, staging은 staging-init-v2.sql 사용)
- `supabase/staging-init-v2.sql` — 운영 schema 추출본 (staging 재구축용)
- `supabase/staging-cleanup.sql` — staging 초기화용
- `supabase/staging-seed.sql` — staging 시드 데이터 (3 시나리오)

### 환경 변수 파일 (모두 gitignore 됨)
- `.env.local` — 로컬 `npm run dev` 기본값
- `.env.staging` — `npm run dev:staging`
- `.env.prod` — `npm run dev:prod` ⚠️ 운영 DB

### Vercel 환경 변수 (Vercel Dashboard에서 관리)
| Name | Production | Preview | Development |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 운영 URL | staging URL | staging URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 운영 anon | staging anon | staging anon |

## Staging 재구축 절차 (DB 초기화가 필요할 때)

```bash
# 1. Staging Dashboard SQL Editor에서:
# https://supabase.com/dashboard/project/afydtaxmuwjdhmdwgemy/sql/new

# 2. supabase/staging-cleanup.sql 내용 paste → Run
# (모든 객체 제거)

# 3. supabase/staging-init-v2.sql 내용 paste → Run
# (운영 schema 복원)

# 4. Authentication → Users 에서 6명 다시 생성 (수동, MEMORY.md 정책)
#    karin.kim@nxtcloud.kr / admin@nxtcloud.kr / jack.choi@nxtcloud.kr
#    teo.park@nxtcloud.kr / sik.ham@nxtcloud.kr / ella.kim@nxtcloud.kr
#    비번 공통: 12345678aA, Auto Confirm 체크

# 5. supabase/staging-seed.sql 내용 paste → Run
# (시드 데이터 + profiles role/team 갱신)
```

## 트러블슈팅

### Vercel 빌드 실패 — ESLint 에러
- `.eslintrc` 또는 파일 단위 disable comment 추가
- 또는 해당 파일 정리/삭제 후 재push

### Staging에 로그인 안 됨
- Supabase Dashboard → Authentication → URL Configuration 확인
- Site URL과 Redirect URLs에 staging 도메인 등록되어 있는지

### 새 사용자 가입은 어떻게?
- **운영**: 자체 회원가입 흐름 + handle_new_user 트리거가 profiles 자동 생성
- **Staging**: Dashboard → Authentication → Add user (수동, 6명만 유지)

### `uuid = text` 에러 (마이그레이션 실행 시)
- enum literal에 명시적 cast 필요: `'msp'::contract_type`
- `user_role() IN ('admin', 'c_level')` → `IN ('admin'::user_role, 'c_level'::user_role)`
- 자세한 건 staging-init-v2.sql 참고

## 운영 데이터 보호 규칙

1. **로컬 `.env.local`은 staging 고정** — 운영 직접 연결은 사고 위험
2. **운영 데이터 봐야 할 땐 Vercel Production URL 접속** — `npm run dev:prod` 지양
3. **운영 DB 변경은 항상 사용자 명시적 승인 후** — MCP apply_migration도 사전 alert
4. **service_role key는 절대 클라이언트 노출 X** — `NEXT_PUBLIC_` 접두사 절대 X

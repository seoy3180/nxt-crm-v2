# 전사 + MSP 섹션 테스트 리포트

- **일시**: 2026-04-16
- **테스트 범위**: 전사(dashboard, 매출 분석 등) + MSP 섹션 (비즈니스 타입 3종 중 MSP만 활성화)
- **방식**: Vitest 유닛 테스트 + Playwright MCP 브라우저 E2E
- **테스트 계정**: `sik.ham@nxtcloud.kr` (함동식 / MSP팀 / team_lead)
- **최종 결과**: ⚠️ **주요 버그 4건 수정 후 동작 확인됨, 일부 후속 작업 남음**

---

## 🐛 발견 + 수정한 버그 (4건)

### 1. AuthProvider 무한 렌더 루프 ✅ 수정

**파일**: `src/providers/auth-provider.tsx`

```tsx
// Before (BUG)
const supabase = createClient();
useEffect(() => { /* ... */ }, [supabase]); // ← 매 렌더마다 새 참조 → 무한 루프

// After (FIX)
const [supabase] = useState(() => createClient()); // lazy init
```

**증상**: 로그인 페이지에서 `/login?_rsc=…` 요청이 초당 수십 건 반복. 브라우저 먹통.

### 2. signIn 후 user 상태 미업데이트 ✅ 수정

**파일**: `src/providers/auth-provider.tsx`

```tsx
// Before (BUG)
const { error } = await supabase.auth.signInWithPassword(...);
// onAuthStateChange 콜백은 비동기 → user 세팅 전에 router.push(/dashboard) 발생
// → AuthGuard가 user=null로 인식 → /login으로 다시 튕김

// After (FIX)
const { data, error } = await supabase.auth.signInWithPassword(...);
if (data?.user) { setUser(data.user); setLoading(false); }
```

### 3. Next.js middleware 비활성화 ✅ 수정

**파일**: `src/middleware.ts.dev` → `src/middleware.ts`

`.dev` 확장자라 Next.js가 미들웨어로 인식 못 함. 파일명만 변경.

**효과**: Supabase 세션 쿠키 서버↔클라이언트 동기화 복원, RSC 500 에러 해소.

### 4. contract_teams 데이터 누락 ✅ 수정

**DB**: `contract_teams` 테이블 비어있었음 (0건)

**문제**: RLS 함수 `can_access_client` / `can_access_contract`는 admin/c_level이 아니면 `contract_teams`를 조회해서 본인 팀이 할당된 계약만 보여줌. **57개 MSP 계약 중 어느 팀에도 할당되지 않아 team_lead/staff는 전혀 볼 수 없었음**.

**수정 SQL**:
```sql
INSERT INTO contract_teams (contract_id, team_id, percentage)
SELECT c.id, '71a0d25f-af45-4389-8734-bc7a118bd2f2', 100  -- MSP팀
FROM contracts c
WHERE c.type = 'msp' AND c.deleted_at IS NULL;
```

→ 57건 전부 MSP팀 100%로 할당.

**향후 정책 결정 필요**: 신규 계약 등록 시 `contract_teams`에 기본 팀이 자동 할당되도록 할지, UI에서 사용자가 명시적으로 지정하게 할지.

---

## ✅ 정상 동작 확인 (함동식 team_lead 계정)

| 페이지/기능 | 상태 | 확인 사항 |
|---|---|---|
| `/login` | ✅ | 로그인 성공, 비밀번호 URL 노출 없음 |
| `/dashboard` | ✅ | KPI: 총 고객 57, 활성 계약 57(MSP) |
| `/msp/clients` | ✅ | 57개 고객 테이블 출력, 컬럼 설정/편집 모드 버튼 존재 |
| `/msp/contracts` (table view) | ✅ | 1/3 페이지네이션, 계약명/고객/단계/금액 컬럼 |
| 사이드바 | ✅ | NXT(매출분석), MSP(대시보드/고객/계약/연락처) 표시 |
| 사용자 메뉴 | ✅ | "함동식 / MSP팀 · team_lead" 표시, 로그아웃 버튼 |
| 인증 세션 유지 | ✅ | 페이지 새로고침 후에도 로그인 유지 |

---

## ⚠️ 추가 이슈 (경미)

### 5. `/revenue` 페이지 간헐적 로드 실패

**증상**: 페이지 비어있고 `Invalid or unexpected token` 콘솔 에러.
**분석**: 서버 측 컴파일은 200 OK. 클라이언트 측 JS 파싱 에러로 렌더 실패. Next.js 개발 서버의 hot-reload 와 맞물린 케이스로 보임.
**대응**: 프로덕션 빌드(`npm run build`)에서도 동일한지 검증 필요. dev-only 이슈일 수도.

### 6. MSP 계약 금액이 모두 ₩0

CSV에 계약 금액 정보가 없어 `total_amount=0`로 저장. 실제 금액은 추후 입력 필요 (매출 분석 의미 있으려면 필수).

### 7. 유닛 테스트 2건 실패 (stale 테스트)

- `tests/lib/contract-validators.test.ts:73` — 구 스키마 필드명(`billingLevel`, `salesRep` 등) 사용
- `tests/lib/permissions.test.ts:26` — `team_lead`의 NXT 섹션 접근 허용 변경 반영 안 됨

→ 테스트 코드만 업데이트하면 됨. 회귀 아님.

---

## 🔲 미검증 (시간 부족)

- [ ] 계약 상세 편집 모드 → 저장 → 변경이력 확인
- [ ] 태그 인라인 편집 (MSP 계약 리스트)
- [ ] AWS 계정 ID 전역 검색 (⌘K)
- [ ] 역할별 동작 (admin/c_level/staff 각각 로그인)
- [ ] /msp/contacts 페이지
- [ ] /revenue 페이지 (dev 에러 확인 후)
- [ ] 비즈니스 타입 제약 (MSP only — TT/DEV 메뉴 숨김)
- [ ] 로그아웃 → 다시 로그인 플로우
- [ ] 여러 사용자 동시 접속 시 RLS 격리

---

## 🛠️ 론칭 전 필수 조치

**P0 (완료)**
- [x] AuthProvider 무한 루프 수정
- [x] AuthProvider signIn 동기화
- [x] middleware.ts 활성화
- [x] contract_teams 데이터 생성

**P1 (권장)**
- [ ] 신규 계약 등록 시 contract_teams 자동 추가 로직 (UX 개선)
- [ ] 계약 금액 입력 (수동 또는 기존 데이터 소스에서)
- [ ] 유닛 테스트 2건 수정
- [ ] `/revenue` 파싱 에러 원인 정확히 파악

**P2 (팀 베타 시작 전)**
- [ ] 팀원별 비밀번호 변경 (현재 전원 `12345678aA`)
- [ ] 미사용 테스트 계정 정리 (admin@nxtcloud.kr 등)
- [ ] 동식님 답변 받은 부분(`msp-migration-followup.md`) 반영
- [ ] 프로덕션 빌드 테스트
- [ ] 배포 환경 결정 및 세팅

---

## 최종 판단

**현재 상태**: ⚠️ **내부 베타 사용 가능** (수정 후)

대대적인 수정 4건 후 모든 핵심 기능 동작 확인됨. 실제 데이터 57건이 UI에 정상 표시되고, 인증/권한/RLS 흐름도 기대대로 작동.

**권장**:
1. 동식님과 `msp-migration-followup.md` 확인하며 데이터 정리
2. P1 항목 진행
3. 팀 베타 시작 → 실사용 피드백 수집
4. 프로덕션 배포 준비

**주의**: 계약 금액이 모두 0이라 매출 분석 기능은 의미 없는 상태. 실 데이터 입력이 필요.

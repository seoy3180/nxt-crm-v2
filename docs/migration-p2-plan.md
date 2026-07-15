# P2 실행 계획 — 세션주입 PoC (⛔ hard gate)

> `migration-plan.md` **P2** 실행 계획. 작성 2026-06-25.
> 전제: P0(재추출)·P1(인벤토리+결정: BE=Node+TS+pg) 완료.
> 게이트: ⛔ — 통과 못 하면 P7(도메인 API) 진입 금지. 실패 시 BE 스택 재선택 또는 §8 B안.
>
> **진행 상태**: ✅ **P2 게이트 전체 통과 (2026-06-25)** — (a) 로컬 11항목 + (b) ClickHouse-managed 5/5. A안(RLS 유지) 확정. (결과 §6)

---

## 1. 검증 명제 (왜 P2가 단일 의존점인가)

A안(RLS 유지) 전체가 이 한 문장에 달려 있다:

> **BE가 요청마다 트랜잭션 단위로 사용자 신원을 주입(`SET LOCAL`)하고, RLS가 그 신원으로 행을 격리하며, 미주입 시 deny(fail-closed)된다.**

Supabase는 `auth.uid()`가 GoTrue 세션에서 신원을 가져왔다. 자체 BE에선 그게 없으므로 `current_user_id()` 헬퍼 + `SET LOCAL app.current_user_id`로 대체한다(§3.1). 이게 선택 드라이버(Node+`pg`)와 운영 DB(ClickHouse-managed Postgres)에서 **실제로 동작하는지**가 P2다.

---

## 2. 2단계 구조 — 로컬 선행 → managed 최종

| 단계 | 환경 | 목적 | 통과 의미 |
|---|---|---|---|
| **(a) 선행검증** | 로컬 PG (Docker `postgres:18`) | 원리·드라이버 검증 | Node+`pg`+tx wrapper 방향 확정 |
| **(b) 최종 게이트** | ClickHouse-managed Postgres | managed 특화 검증 | **P2 게이트 통과** |

> ⚠️ **(a) 통과 = 선행검증일 뿐이다. P2 게이트 통과는 (b)에서만 성립한다.** 로컬에서 되는 것이 managed에서도 된다는 보장은 없다(권한 모델·풀러·extension 차이).

(a)·(b) **모두 ✅ 통과 (2026-06-25)**. (b)는 `nxt_crm` DB + 비특권 롤 `nxt_crm_app` + PgBouncer(6432)에서 검증 완료 (결과 §6).

---

## 3. 검증 항목 체크리스트

### (a) 로컬 PG — ✅ 전부 통과 (2026-06-25, 결과 §6)
- [x] `current_user_id()` 헬퍼: `NULLIF(current_setting('app.current_user_id', true),'')::uuid` (2-arg 필수, 미설정→NULL)
- [x] `BEGIN → SET LOCAL app.current_user_id → current_setting` 읽기 동작
- [x] **RLS 격리**: 팀A 신원으로 `SELECT` → 팀A 행만 반환
- [x] **쓰기 격리**: 팀A 신원으로 팀B 행 `UPDATE`/`DELETE` → 0 rows (차단)
- [x] **쓰기 위조 차단**: 팀A가 보이는 자기 행의 `owner_team_id`를 팀B로 변경 → `WITH CHECK` 거부 (실전 핵심 위조)
- [x] **미설정 deny**: `SET` 없이 `SELECT` → 0행, 쓰기 거부 (fail-closed)
- [x] **tx 단위 격리**: 풀 커넥션 재사용 시 이전 트랜잭션의 `SET LOCAL`이 다음에 새지 않음
- [x] **FORCE RLS 원리**: 비특권 롤(테이블 owner 아님)로 위가 동작 (owner BYPASS 방지)
- [x] **INSERT WITH CHECK**: 팀A 신원으로 팀B 소유 행 `INSERT` → 거부 (신원 위조 방지)
- [x] **ROLLBACK 후 누수 없음**: tx 중 에러 → `ROLLBACK` 후 다음 쿼리에 신원값 안 남음
- [x] **invalid UUID 방어**: wrapper가 UUID 형식 검증 실패 시 DB 주입 안 함 (NULL→deny, 401/403) — §3.1

### (b) ClickHouse-managed Postgres — ✅ 전부 통과 (2026-06-25, 결과 §6)
- [x] 비특권 앱 롤 `CREATE ROLE` 권한 (managed가 `nxt_crm_app` 생성 허용)
- [x] `FORCE ROW LEVEL SECURITY` **허용** (managed가 막지 않음)
- [x] extension / `gen_random_uuid` (시드 INSERT 성공)
- [x] **PgBouncer transaction-mode**(6432)에서 `SET LOCAL` 동작 + prepared statement 충돌 없음
- [x] **RLS 격리** (팀A→A행만, 팀B UPDATE 0) — managed에서 실증

> CDC용 publication/replication slot 접근은 **P10 분석 파이프라인 항목이며 P2 게이트에서 제외**한다.

---

## 4. PoC 구성

```
~/crm-mig-poc/                # 임시, 검증 후 monorepo apps/be 로 이식
├── docker-compose.yml         # postgres:18 로컬 1개
├── init.sql                   # 헬퍼 + 테스트 테이블 + RLS + 비특권 롤
├── poc.mjs                    # Node + pg 세션주입 검증 러너
├── package.json               # 의존성: pg
└── README.md                  # 실행법
```

### `init.sql` 골자 (운영의 user→team→행 격리 구조 재현)
- `current_user_id()` 헬퍼 (위 정의)
- `profiles(id uuid PK, team_id uuid)` + 시드 (팀A 사용자 1명, 팀B 사용자 1명)
- 테스트 테이블 `widgets(id uuid, owner_team_id uuid, name text)` + 시드 (팀A/팀B 소유 각 2~3행)
- `current_team_id()` = `(SELECT team_id FROM profiles WHERE id = current_user_id())` — 운영 `user_team_id()` 재현 (⚠️ `profiles` 참조 → **테이블 생성 후** 정의해야 함, 안 그러면 `relation does not exist`)
- `ALTER TABLE widgets ENABLE ROW LEVEL SECURITY; ... FORCE ROW LEVEL SECURITY;`
- 정책: `USING (owner_team_id = current_team_id())` + `WITH CHECK (owner_team_id = current_team_id())` — 운영 `user_team_id()`/`can_access_*` 격리 원형
- 비특권 롤: `CREATE ROLE app_user LOGIN NOSUPERUSER NOBYPASSRLS; GRANT ... ON widgets, profiles TO app_user;`

### `poc.mjs` 골자 (운영 BE의 tx wrapper 원형)
```js
// withCurrentUser: 운영 미들웨어의 핵심 패턴을 미리 구현
async function withCurrentUser(pool, userId, fn) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId))
    throw new Error('invalid user id');   // UUID 검증 후 주입 (§3.1 — 미인증/형식오류는 주입 전 차단)
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SELECT set_config('app.current_user_id', $1, true)", [userId]); // = SET LOCAL
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) { await c.query('ROLLBACK'); throw e; }
  finally { c.release(); }   // 풀 반환 후 다음 사용 시 컨텍스트 안 새는지 검증
}
```
- 테스트 케이스: ①팀A SELECT→팀A만 ②팀A가 팀B `UPDATE`→0(차단) ③팀A가 A-1을 팀B 소유로 변경→`WITH CHECK` 거부(위조) ④팀A가 팀B 소유 `INSERT`→거부 ⑤미설정 SELECT→0 ⑥풀 재사용 후 미설정→0(누수 없음) ⑦tx 중 에러→`ROLLBACK` 후 누수 없음 ⑧invalid UUID→wrapper 거부 ⑨FORCE RLS/비특권 롤 격리 적용
- 각 케이스 `✅/❌` + 기대값 대조 출력

---

## 5. 실행 절차

1. `docker compose up -d --wait` — postgres:18 기동 + `init.sql` **자동 적용**(`/docker-entrypoint-initdb.d`로 컨테이너 최초 생성 시 1회 실행). **psql 재적용 금지**(중복 생성 실패)
2. `npm install && npm run poc` → 항목별 결과표 출력
3. (a) 전체 ✅ 확인 → 선행검증 통과
4. 재실행 시: `docker compose down -v`(볼륨 삭제 → init 재적용) 후 1번부터
5. (b) managed 검증 — **별도 파일 사용**, 접속 host·비번은 문서에 쓰지 않고 env로만:
   - a. `~/crm-mig-poc/init_managed.sql`을 `nxt_crm`에 `nxt_crm_admin`으로 적용: `psql ... -v APP_ROLE_PASSWORD="'<비번>'" -f init_managed.sql` (앱 롤 `nxt_crm_app`·widgets·RLS 생성)
   - b. `apps/be`(`@nxt-crm/be`)를 managed `DATABASE_URL`로 실행 — TLS는 `ssl.ca`(`PG_CA_CERT_PATH`), `sslmode`는 URL에서 생략, PgBouncer는 포트 `6432`
   - c. (b) 5항목(§3·§6) 확인

---

## 6. 통과 기준 / 실패 시

- **(a) 통과**: 11항목 ✅ → Node+`pg`+tx wrapper 방향 확정, 운영 BE `withCurrentUser()` 설계 근거 확보
- **(b) 통과**: 5항목 ✅ → **P2 게이트 통과** → P3·P4 진입 가능
- **(a) 실패**: 거의 표준 PG 동작이라 가능성 낮음. 실패 시 드라이버/풀링 설정 재점검
- **(b) 실패** (특히 FORCE RLS 불허 / 비특권 롤 생성 불가 / 풀러 비호환): ClickHouse-managed가 RLS 모델에 부적합 → **§8 B안**(다른 관리형 Postgres) 검토

### ✅ (a) 로컬 선행검증 실행 결과 — 2026-06-25

- 환경: Docker `postgres:18.4` (`~/crm-mig-poc/`), Node + `pg`, 비특권 롤 `app_user`(`NOSUPERUSER`/`NOBYPASSRLS`)
- 결과: **10 테스트 케이스 = 11 검증항목 전부 통과** (항목1 헬퍼 케이스에 항목2 `current_setting` 읽기 통합)

| 검증 | 결과 |
|---|---|
| `current_user_id()`/`current_team_id()` 헬퍼 + `current_setting` 읽기 | ✅ |
| `SET LOCAL` + RLS SELECT 격리 (팀A → A행만) | ✅ |
| 쓰기 격리 (팀A가 팀B `UPDATE` → 0행) | ✅ |
| 쓰기 위조 차단 (팀A가 A-1을 팀B 소유로 변경 → `42501` 거부) | ✅ |
| INSERT WITH CHECK (팀A가 팀B 소유 `INSERT` → `42501` 거부) | ✅ |
| 미설정 deny (신원 없이 → 0행) | ✅ |
| tx 단위 격리 (풀 재사용 후 미설정 → 0행, 누수 없음) | ✅ |
| ROLLBACK 후 누수 없음 (에러 후 → 0행) | ✅ |
| invalid UUID 방어 (wrapper가 주입 전 차단) | ✅ |
| FORCE RLS / 비특권 롤 격리 적용 | ✅ |

- **핵심 확인**: `SET LOCAL`이 트랜잭션 스코프라 **풀 재사용·ROLLBACK 후 신원 누수 0** → pooling 우려가 로컬 한정으로 해소. `withCurrentUser()`를 P4/P5 세션주입 미들웨어 원형으로 확정.
- **(b) 통과로 P2 게이트 전체 통과** (아래 결과).

### ✅ (b) ClickHouse-managed Postgres 최종 게이트 — 2026-06-25

- 환경: ClickHouse-managed Postgres `nxt_crm`(PG18), 비특권 롤 `nxt_crm_app`, TLS(CA 검증 — MITM 방지), PgBouncer `6432`(transaction-mode)
- 결과: **5/5 통과 → P2 게이트 전체 통과**

| 검증 | 결과 |
|---|---|
| (b)-1 비특권 롤 `CREATE ROLE` | ✅ managed 허용 (`nxt_crm_app`) |
| (b)-2 `FORCE ROW LEVEL SECURITY` 허용 | ✅ |
| (b)-3 extension(`gen_random_uuid`) | ✅ |
| (b)-4 PgBouncer transaction-mode | ✅ `SET LOCAL` 동작, prepared 충돌 없음 |
| (b)-5 RLS 격리 (팀A→A행만, 팀B UPDATE 0) | ✅ |

→ **A안(RLS 유지)이 ClickHouse-managed Postgres에서 성립 확정.** hard blocker #2(§0)·§3.5 `[확인필요]` 실증 해소.
- TLS: `connectionString`의 `sslmode`(verify-full alias)와 ssl 옵션 충돌 → `DATABASE_URL`에서 `sslmode` 생략 + `pool.ts`의 `ssl.ca`(PG_CA_CERT_PATH)로 검증. PgBouncer는 포트 `6432`.

---

## 7. 결정 사항 / 잔여

- [x] PoC 디렉토리 **위치** → **`~/crm-mig-poc/`** (현 `nxt_crm_v2` 밖, 생성 완료. 검증 후 monorepo `apps/be`로 이식)
- [x] 로컬 PG **버전** → **18** (target managed PG18 일치, (a) 실행 완료)
- [x] **(b) 완료**: 권한(403) 해소 → `nxt_crm`·`nxt_crm_app`·PgBouncer(6432)에서 5/5 통과 (§6)

---

## 8. P2 이후 연결

- (a) `withCurrentUser()` 코드 → P4/P5 BE 공통기반의 **세션주입 미들웨어** 원형으로 이식
- (b) 통과 → P3(인프라 PoC: 풀러·네트워크·배포)와 P4(스키마+RLS 이전)의 전제 충족

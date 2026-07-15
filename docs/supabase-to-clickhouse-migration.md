# Supabase to ClickHouse 마이그레이션 가이드

작성일: 2026-06-16  
대상 프로젝트: NXT CRM v2  
스키마 기준: `supabase/schema.sql`

## 1. 결론

이 프로젝트에서 ClickHouse는 Supabase의 1:1 대체 DB로 보지 않는 것이 안전하다. ClickHouse는 분석 질의와 집계에 강한 OLAP DB이고, Supabase Postgres는 인증, RLS, 트랜잭션, FK, 트리거, RPC 기반 업무 쓰기에 적합한 OLTP DB다. 현재 NXT CRM v2는 Supabase Auth, RLS, RPC, trigger, soft delete, 예치금 잔액 재계산 로직을 운영 경로에 직접 사용한다.

권장 아키텍처는 다음과 같다.

```text
Next.js CRM app
  |
  | CRUD, Auth, RLS, RPC, 업무 트랜잭션
  v
Supabase Postgres  -------------------+
  |                                   |
  | ClickPipes Postgres CDC           | Supabase Auth / Storage / Edge 기능 유지
  v                                   |
ClickHouse                            |
  |
  | 분석, 대시보드, 대용량 집계, 장기 이력 조회
  v
BI / internal analytics / server-side reporting APIs
```

완전 이전, 즉 Supabase를 제거하고 ClickHouse만 운영 DB로 쓰는 경로는 별도 신규 백엔드 프로젝트로 취급해야 한다. 인증, 권한, 모든 쓰기 검증, RPC, 트리거, 제약조건을 애플리케이션 또는 별도 서비스로 재구현해야 한다.

## 2. 마이그레이션 전략 선택

| 전략 | 권장도 | 사용 시점 | 핵심 방식 |
| --- | --- | --- | --- |
| Supabase 원장 + ClickHouse 분석 복제 | 높음 | 운영 CRM 유지, 분석 성능 개선 | ClickPipes Postgres CDC로 필요한 public 테이블만 복제 |
| 일회성 덤프 / 주기적 배치 적재 | 중간 | PoC, 비실시간 리포트, 과거 데이터 분석 | `supabase db dump`, `psql \copy`, ClickHouse `postgresql()` table function, CSV/Parquet 적재 |
| ClickHouse 완전 전환 | 낮음 | CRM을 append-heavy 분석 앱으로 재설계할 때만 | 앱의 데이터 접근 계층과 권한 체계를 전면 재작성 |

공식 ClickHouse 문서도 PostgreSQL에서 ClickHouse로 옮길 때 일반적으로 실시간 CDC 또는 수동 bulk load를 선택하라고 안내한다. 최신 데이터가 필요한 대부분의 현대적인 사용 사례에서는 CDC가 적합하고, 단순하거나 실시간성이 낮은 경우에는 수동 bulk load가 맞다.

## 3. 현재 프로젝트 영향 범위

현재 repo 기준 주요 의존성은 다음과 같다.

| 영역 | 현재 구현 | ClickHouse 전환 시 영향 |
| --- | --- | --- |
| 인증 | `@supabase/ssr`, `@supabase/supabase-js`, `src/lib/supabase/*`, `auth-provider` | ClickHouse에는 Supabase Auth가 없으므로 유지하거나 별도 인증 시스템 필요 |
| 권한 | Supabase RLS + `can_access_client`, `can_access_contract` | ClickHouse로 복제 시 RLS는 자동 이전되지 않음. 분석 레이어에서 별도 masking/view/role 필요 |
| 업무 쓰기 | `supabase.from(...).insert/update`, RPC 호출 | ClickHouse는 고빈도 row update 중심 CRM 쓰기 DB로 부적합 |
| DB 로직 | trigger, FK, CHECK, generated column, PL/pgSQL 함수 | ClickHouse로 자동 변환 불가. 완전 이전 시 애플리케이션 로직으로 재작성 |
| 예치금 | 거래 변경 시 trigger로 잔액 재계산 | ClickHouse에서는 집계 view/materialized view로 읽기 모델 구성 권장 |
| Soft delete | `deleted_at IS NULL` 필터 | ClickHouse current view에서 동일 필터 적용 |
| 검색 | Postgres `pg_trgm` 인덱스 | ClickHouse용 검색 인덱스/정규화 전략 재설계 필요 |

현재 `supabase/schema.sql` 기준 public 테이블은 모두 기본키가 정의되어 있어 ClickPipes CDC 요건에는 잘 맞는다. 다만 개인정보와 권한 정보가 포함되므로 publication 범위를 반드시 최소화한다.

## 4. 사전 준비

### 4.1 백업

운영 작업 전에는 Supabase 백업을 먼저 확보한다.

```bash
# 운영 DB 연결 정보가 설정된 상태에서 실행
npx supabase db dump --schema public > backups/supabase-public-YYYYMMDD.sql
```

Supabase Dashboard의 `Database > Backups`에서 restore 가능한 백업도 확인한다. PITR이 필요한 운영 환경이면 작업 전에 PITR 활성화 여부와 복구 가능 시점을 확인한다.

주의할 점:

- Supabase 백업은 DB 백업이다. Storage API의 실제 object 파일은 별도 백업 대상이다.
- 복구 작업은 프로젝트 접근 불가 시간이 생길 수 있다.
- replication slot 또는 subscription을 쓰는 경우 restore 전후로 재생성이 필요할 수 있다.

### 4.2 스키마 기준 고정

이 프로젝트는 `supabase/migrations/`가 아니라 `supabase/schema.sql`이 정본이다. 준비 단계에서 최신 운영 스키마를 다시 추출한다.

```bash
npx supabase db dump --schema public > supabase/schema.sql
```

`supabase/README.md`에 적힌 것처럼 기존 `migrations/00001~00035`는 역사 기록으로만 보고 신규 환경 재현 기준으로 사용하지 않는다.

### 4.3 CDC 대상 테이블 결정

추천 publication 범위는 분석에 필요한 public 테이블만이다.

기본 추천:

```text
teams
team_business_domains
profiles
employees
clients
client_msp_details
client_edu_details
contacts
contracts
contract_msp_details
contract_teams
contract_tech_leads
contract_history
education_operations
education_operation_dates
instructors
operation_instructors
deposit_accounts
deposit_transactions
```

기본 제외:

```text
user_preferences
```

`profiles`, `employees`, `contacts`에는 이름, 이메일, 전화번호가 포함될 수 있다. BI나 외부 분석 도구에 직접 노출할 계획이면 ClickHouse 쪽에서 masking view를 만들거나 publication에서 민감 컬럼을 제외한다.

테이블 기본키 확인 쿼리:

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  bool_or(con.contype = 'p') AS has_primary_key
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_constraint con ON con.conrelid = c.oid
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
GROUP BY n.nspname, c.relname
ORDER BY c.relname;
```

ClickPipes CDC에 포함되는 테이블은 primary key가 있거나 `REPLICA IDENTITY`가 설정되어야 한다.

## 5. 권장 경로: ClickPipes CDC

### 5.1 Supabase Postgres 연결 확인

ClickPipes CDC는 Supabase pooler가 아니라 실제 Postgres direct connection 정보를 써야 한다. Supabase Project Settings의 Database connection parameters에서 host, port, database, user 정보를 확인한다. ClickHouse 문서는 Supabase pooler 같은 Postgres proxy를 CDC replication에 쓰지 말라고 명시한다.

확인 쿼리:

```sql
SHOW wal_level;
SHOW max_replication_slots;
SHOW max_wal_senders;
SHOW max_slot_wal_keep_size;
```

`wal_level`은 logical이어야 한다. Supabase 관리형 환경에서는 직접 `postgresql.conf`를 수정하지 않고 Dashboard/지원되는 설정 경로를 사용한다.

### 5.2 ClickPipes 전용 유저 생성

Supabase SQL Editor 또는 admin 접속에서 실행한다. 비밀번호는 secret manager에 저장하고 repo에 커밋하지 않는다.

```sql
CREATE USER clickpipes_user PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';

GRANT USAGE ON SCHEMA public TO clickpipes_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO clickpipes_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO clickpipes_user;

ALTER USER clickpipes_user WITH REPLICATION;
ALTER USER clickpipes_user BYPASSRLS;
```

`BYPASSRLS`가 중요하다. 현재 스키마는 RLS가 전면 적용되어 있으며, CDC 유저가 RLS에 막히면 ClickHouse에 누락 데이터가 생길 수 있다.

반대로 `BYPASSRLS`가 적용된 복제 유저는 publication 대상 테이블의 전체 row를 읽을 수 있다. ClickHouse로 넘어간 데이터에는 Supabase RLS가 적용되지 않으므로, ClickHouse database/user/role, masking view, API-level permission을 별도로 설계한다.

### 5.3 Publication 생성

불필요한 WAL 해석과 개인정보 노출을 줄이기 위해 `FOR ALL TABLES`보다 필요한 테이블만 명시한다.

```sql
CREATE PUBLICATION clickpipes_nxt_crm FOR TABLE
  public.teams,
  public.team_business_domains,
  public.profiles,
  public.employees,
  public.clients,
  public.client_msp_details,
  public.client_edu_details,
  public.contacts,
  public.contracts,
  public.contract_msp_details,
  public.contract_teams,
  public.contract_tech_leads,
  public.contract_history,
  public.education_operations,
  public.education_operation_dates,
  public.instructors,
  public.operation_instructors,
  public.deposit_accounts,
  public.deposit_transactions;
```

삭제를 ClickHouse에 반영하지 않고 장기 이력 보존을 우선할 경우 publication을 insert/update만 발행하도록 만들 수 있다.

```sql
CREATE PUBLICATION clickpipes_nxt_crm_history
FOR TABLE
  public.contracts,
  public.contract_history,
  public.deposit_transactions
WITH (publish = 'insert,update');
```

운영 CRM에서는 soft delete를 쓰므로 일반적으로 delete 이벤트를 막을 필요는 낮다. 다만 물리 delete가 발생할 수 있는 테이블을 장기 보존하려면 위 옵션을 검토한다.

### 5.4 WAL 보존 설정

ClickHouse의 Supabase source guide는 `max_slot_wal_keep_size`를 최소 100GB 또는 `102400` 이상으로 늘리라고 안내한다. ClickPipes FAQ는 최소 2일치 WAL, 트래픽이 큰 DB는 피크 일일 WAL의 2~3배를 권장한다.

Supabase에서 이 값을 변경하면 DB restart가 필요할 수 있으므로 작업 시간을 잡는다.

WAL 생성량 대략 확인:

```sql
SELECT pg_wal_lsn_diff(pg_current_wal_insert_lsn(), '0/0') / 1024 / 1024 AS wal_generated_mb;
```

운영 중 모니터링:

```sql
SELECT
  slot_name,
  active,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
FROM pg_replication_slots
ORDER BY slot_name;
```

### 5.5 ClickHouse Cloud에서 ClickPipe 생성

ClickHouse Cloud Console에서 진행한다.

1. ClickHouse service 생성
2. `Data Sources`에서 `Set up a ClickPipe`
3. `Postgres CDC` 선택
4. Supabase direct connection 정보 입력
5. ClickPipes IP allowlist가 필요한 경우 Supabase 네트워크 설정 확인
6. publication으로 `clickpipes_nxt_crm` 선택
7. 대상 database 선택, 예: `nxt_crm`
8. 테이블 선택 및 컬럼 제외 설정
9. 초기 snapshot 병렬도와 sync interval 조정
10. initial load 완료 후 CDC lag 확인

초기 적재 중에는 Supabase DB restart, 대규모 DDL, 대량 UPDATE를 피한다. initial load 도중 연결이 끊기면 resync가 필요할 수 있다.

## 6. ClickHouse 모델링

### 6.1 Raw CDC 테이블과 current view 분리

ClickPipes는 UPDATE/DELETE를 ClickHouse에 새 버전 row로 적재한다. 보통 `ReplacingMergeTree(_peerdb_version)`와 `_peerdb_is_deleted` 같은 메타 컬럼을 사용한다. deduplication은 비동기로 일어나므로 분석 쿼리는 raw table을 직접 보지 말고 current view를 통한다.

예시:

```sql
CREATE VIEW nxt_crm.contracts_current AS
SELECT *
FROM nxt_crm.contracts FINAL
WHERE _peerdb_is_deleted = 0
  AND deleted_at IS NULL;

CREATE VIEW nxt_crm.clients_current AS
SELECT *
FROM nxt_crm.clients FINAL
WHERE _peerdb_is_deleted = 0
  AND deleted_at IS NULL;

CREATE VIEW nxt_crm.deposit_accounts_current AS
SELECT *
FROM nxt_crm.deposit_accounts FINAL
WHERE _peerdb_is_deleted = 0
  AND deleted_at IS NULL;

CREATE VIEW nxt_crm.deposit_transactions_current AS
SELECT *
FROM nxt_crm.deposit_transactions FINAL
WHERE _peerdb_is_deleted = 0
  AND voided_at IS NULL;
```

`FINAL`은 중복 버전 제거 정확성을 높이지만 비용이 있다. 자주 쓰는 대시보드는 refreshable materialized view로 별도 집계 테이블을 만든다.

### 6.2 매출 집계 예시

```sql
CREATE MATERIALIZED VIEW nxt_crm.monthly_revenue_mv
REFRESH EVERY 10 MINUTE
ENGINE = MergeTree
ORDER BY (month, type)
AS
SELECT
  toStartOfMonth(created_at) AS month,
  type,
  sum(total_amount) AS total_amount,
  count() AS contract_count
FROM nxt_crm.contracts FINAL
WHERE _peerdb_is_deleted = 0
  AND deleted_at IS NULL
GROUP BY
  month,
  type;
```

### 6.3 예치금 집계 예시

Postgres에서는 `deposit_transactions` 변경 시 trigger가 `deposit_accounts.balance`를 재계산한다. ClickHouse에서는 원장 테이블을 기준으로 읽기 집계를 만든다.

```sql
CREATE MATERIALIZED VIEW nxt_crm.deposit_balance_mv
REFRESH EVERY 10 MINUTE
ENGINE = MergeTree
ORDER BY account_id
AS
SELECT
  account_id,
  sumIf(amount, txn_type = 'deposit') AS total_deposit,
  sumIf(amount, txn_type = 'usage') AS total_usage,
  sumIf(amount, txn_type = 'adjustment') AS total_adjustment,
  sumIf(amount, txn_type = 'refund') AS total_refund,
  sumIf(amount, txn_type = 'deposit')
    - sumIf(amount, txn_type = 'usage')
    + sumIf(amount, txn_type = 'adjustment')
    - sumIf(amount, txn_type = 'refund') AS balance
FROM nxt_crm.deposit_transactions FINAL
WHERE _peerdb_is_deleted = 0
  AND voided_at IS NULL
GROUP BY account_id;
```

### 6.4 타입 매핑 주의

| Postgres 타입 | ClickHouse 처리 원칙 |
| --- | --- |
| `uuid` | `UUID` |
| `timestamptz` | `DateTime64`, timezone 기준 통일 필요 |
| `date` | `Date32` 또는 `Date` |
| `bigint` | `Int64` |
| `numeric(5,2)` | `Decimal` 계열 |
| enum | `LowCardinality(String)` 또는 ClickHouse `Enum`, 변경 가능성이 있으면 String 선호 |
| `text[]`, enum array | `Array(String)` 계열 |
| `jsonb` | ClickPipes에서는 String으로 복제될 수 있음. 필요 시 JSON 함수 또는 materialized view로 변환 |

NXT CRM의 enum은 업무 상태값 변경 가능성이 있으므로 ClickHouse에서는 처음부터 엄격한 `Enum`보다 `LowCardinality(String)`을 쓰는 편이 운영상 덜 위험하다.

## 7. 검증

### 7.1 row count 검증

Supabase:

```sql
SELECT 'clients' AS table_name, count(*) FROM clients WHERE deleted_at IS NULL
UNION ALL
SELECT 'contracts', count(*) FROM contracts WHERE deleted_at IS NULL
UNION ALL
SELECT 'deposit_transactions', count(*) FROM deposit_transactions WHERE voided_at IS NULL;
```

ClickHouse:

```sql
SELECT 'clients' AS table_name, count()
FROM nxt_crm.clients FINAL
WHERE _peerdb_is_deleted = 0 AND deleted_at IS NULL
UNION ALL
SELECT 'contracts', count()
FROM nxt_crm.contracts FINAL
WHERE _peerdb_is_deleted = 0 AND deleted_at IS NULL
UNION ALL
SELECT 'deposit_transactions', count()
FROM nxt_crm.deposit_transactions FINAL
WHERE _peerdb_is_deleted = 0 AND voided_at IS NULL;
```

### 7.2 금액 검증

Supabase:

```sql
SELECT
  type,
  count(*) AS contract_count,
  sum(total_amount) AS total_amount
FROM contracts
WHERE deleted_at IS NULL
GROUP BY type
ORDER BY type;
```

ClickHouse:

```sql
SELECT
  type,
  count() AS contract_count,
  sum(total_amount) AS total_amount
FROM nxt_crm.contracts FINAL
WHERE _peerdb_is_deleted = 0
  AND deleted_at IS NULL
GROUP BY type
ORDER BY type;
```

### 7.3 CDC lag 확인

Supabase:

```sql
SELECT
  slot_name,
  active,
  confirmed_flush_lsn,
  pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS lag_bytes
FROM pg_replication_slots
WHERE slot_name ILIKE '%click%';
```

ClickHouse에서는 ClickPipes UI의 sync status, last sync time, errors를 확인한다.

### 7.4 애플리케이션 검증

읽기 경로를 ClickHouse로 바꾸기 전후로 다음을 비교한다.

- 대시보드 KPI: 총 고객 수, 계약 수, 계약 금액
- MSP 대시보드: stage별 계약 수, 월별 금액
- 매출 분석: 팀별 배분 금액, 월별 추이
- 예치금: 계좌 잔액, 총 입금, 총 사용, void 반영
- 권한: ClickHouse 기반 API가 Supabase RLS보다 더 많은 데이터를 노출하지 않는지

## 8. Next.js 앱 연동 원칙

ClickHouse 인증 정보를 browser bundle에 넣지 않는다. ClickHouse 질의는 서버 전용 API route, server action, route handler, 백엔드 worker에서 실행한다.

예상 패키지:

```bash
npm install @clickhouse/client
```

환경 변수 예시:

```bash
CLICKHOUSE_URL=https://example.clickhouse.cloud:8443
CLICKHOUSE_USER=analytics_reader
CLICKHOUSE_PASSWORD=...
CLICKHOUSE_DATABASE=nxt_crm
```

역할 분리:

| 경로 | 데이터 소스 |
| --- | --- |
| 로그인, 세션, 프로필 수정 | Supabase |
| 고객/계약/예치금 CRUD | Supabase |
| 권한이 필요한 상세 화면 | Supabase 우선 |
| 대시보드 집계, 월별/팀별 분석 | ClickHouse server-side API |
| 대용량 export/report | ClickHouse |

이 repo에서 실제 코드를 바꿀 때는 Supabase service/hook를 바로 치환하지 말고, 분석 전용 service를 새로 만든다. 예: `src/lib/clickhouse/server.ts`, `src/lib/services/analytics-service.ts`.

## 9. 일회성 bulk load 대안

CDC가 필요 없거나 PoC만 하는 경우에는 bulk load로 시작할 수 있다.

### 9.1 ClickHouse `postgresql()` table function

ClickHouse에서 Postgres를 직접 읽어 적재한다.

```sql
INSERT INTO nxt_crm.contracts_snapshot
SELECT *
FROM postgresql(
  'SUPABASE_DIRECT_HOST:5432',
  'postgres',
  'contracts',
  'clickpipes_user',
  'PASSWORD'
);
```

이 방식은 수백 GB 수준의 bulk load에는 쓸 수 있지만, update/delete를 정확히 따라가기 어렵다. 증분 적재는 `updated_at` 같은 watermark가 안정적일 때만 사용한다.

### 9.2 CSV export/import

Supabase direct Postgres 접속이 가능한 환경에서:

```bash
psql "$SUPABASE_DIRECT_DATABASE_URL" \
  -c "\copy (SELECT * FROM public.contracts) TO 'contracts.csv' WITH CSV HEADER"

clickhouse-client \
  --query "INSERT INTO nxt_crm.contracts_snapshot FORMAT CSVWithNames" \
  < contracts.csv
```

대량 데이터는 CSV보다 Parquet/object storage 경유가 더 안정적일 수 있다.

## 10. 완전 전환이 꼭 필요한 경우의 추가 작업

ClickHouse만 남기는 전환은 다음 범위를 모두 해결해야 한다.

| 항목 | 필요한 작업 |
| --- | --- |
| 인증 | Supabase Auth 대체 또는 Supabase Auth만 별도 유지 |
| RLS | 앱 서버에서 `can_access_client`, `can_access_contract` 동등 로직 구현 |
| FK/CHECK | 쓰기 API에서 모든 참조 무결성과 상태값 검증 구현 |
| Trigger | `updated_at`, 고객 계층 제한, 예치금 잔액, 삭제 가드 로직 구현 |
| RPC | `create_contract_with_details`, `soft_delete_client`, `change_contract_stage` 등 트랜잭션 로직 재작성 |
| UPDATE/DELETE | ClickHouse의 append/update 모델에 맞춘 이벤트 소싱 또는 snapshot 모델 설계 |
| 검색 | `pg_trgm` 대체 검색 설계 |
| 테스트 | CRUD, 권한, 동시성, 실패 rollback 테스트 재작성 |

이 범위는 "DB 마이그레이션"이 아니라 "CRM 백엔드 재플랫폼"이다.

## 11. 운영 런북

### 11.1 배포 전 체크리스트

- [ ] `supabase/schema.sql` 최신화
- [ ] Supabase backup 또는 PITR 복구 가능 시점 확인
- [ ] publication 대상 테이블 확정
- [ ] 개인정보 컬럼 노출 범위 승인
- [ ] ClickPipes user 생성 및 secret 저장
- [ ] `BYPASSRLS` 적용 여부 확인
- [ ] Supabase direct connection 사용, pooler 미사용 확인
- [ ] `max_slot_wal_keep_size`와 WAL 생성량 확인
- [ ] ClickHouse database/user/role 생성
- [ ] initial load 시간대 공지

### 11.2 배포 후 체크리스트

- [ ] ClickPipe initial load 완료
- [ ] CDC lag 정상
- [ ] row count 검증
- [ ] 금액 집계 검증
- [ ] current view와 materialized view 생성
- [ ] BI/API가 raw CDC table이 아니라 current view를 조회
- [ ] ClickHouse 접근 계정 권한 최소화
- [ ] Supabase replication slot retained WAL 모니터링

### 11.3 롤백

권장 구조에서는 Supabase가 원장이므로 롤백은 단순하다.

1. ClickHouse 기반 API/대시보드 feature flag 비활성화
2. 기존 Supabase 집계 경로로 되돌림
3. ClickPipe pause 또는 삭제
4. 필요 시 publication, replication slot, `clickpipes_user` 정리

정리 SQL 예시:

```sql
DROP PUBLICATION IF EXISTS clickpipes_nxt_crm;
DROP USER IF EXISTS clickpipes_user;
```

replication slot은 ClickPipe가 만든 이름을 확인한 뒤 신중히 제거한다.

```sql
SELECT slot_name, active FROM pg_replication_slots;
-- active = false인지 확인 후:
-- SELECT pg_drop_replication_slot('slot_name');
```

## 12. 참고 문서

- [ClickHouse: Comparing PostgreSQL and ClickHouse](https://clickhouse.com/docs/migrations/postgresql/overview)
- [ClickHouse: Ingesting data from Postgres to ClickHouse using CDC](https://clickhouse.com/docs/integrations/clickpipes/postgres)
- [ClickHouse: Supabase source setup guide](https://clickhouse.com/docs/integrations/clickpipes/postgres/source/supabase)
- [ClickHouse: Deduplication strategies using CDC](https://clickhouse.com/docs/integrations/clickpipes/postgres/deduplication)
- [ClickHouse: Ordering Keys](https://clickhouse.com/docs/integrations/clickpipes/postgres/ordering_keys)
- [ClickHouse: Schema changes propagation support](https://clickhouse.com/docs/integrations/clickpipes/postgres/schema-changes)
- [ClickHouse: ClickPipes for Postgres FAQ](https://clickhouse.com/docs/integrations/clickpipes/postgres/faq)
- [ClickHouse: PostgreSQL migration guide, Part 1](https://clickhouse.com/docs/migrations/postgresql/dataset)
- [ClickHouse: ClickHouse JS client](https://clickhouse.com/docs/integrations/javascript)
- [Supabase: Database Backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase: Connect to your database](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase: Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)

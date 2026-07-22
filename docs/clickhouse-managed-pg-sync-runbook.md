# Supabase -> ClickHouse-managed Postgres Sync Runbook

> 단기 목표: Supabase 백엔드는 그대로 운영하고, Supabase Postgres 데이터를 ClickHouse-managed Postgres에 동기화된 Postgres 복제본으로 유지한다.

## 전제

- 운영 원장/source of truth는 계속 Supabase Postgres다.
- ClickHouse-managed Postgres는 단기적으로 읽기 복제본/전환 준비 DB다.
- Supabase API/Auth/RLS/RPC가 ClickHouse-managed Postgres를 직접 쓰는 구조는 아니다.
- Postgres logical replication은 테이블 스키마를 자동 생성하지 않는다. 타깃 DB에 스키마를 먼저 만든 뒤 subscription을 생성해야 한다.

## 현재 네트워크 상태

Supabase direct endpoint는 IPv6-only다.

```text
db.<project-ref>.supabase.co
AAAA <ipv6-address>
A    없음
```

현재 로컬 Mac/Docker 환경은 IPv6 outbound route가 없어 direct endpoint에 붙지 못한다.

```text
nc -6 ... 5432 -> No route to host
Docker postgres:18 -> no response
```

따라서 로컬 `pg_dump` direct 추출은 불가하다. 지금은 기존 정본인 `supabase/schema.sql`에서 동기화 타깃용 스키마를 생성해 사용한다.

## 생성된 파일

| 파일 | 용도 |
|---|---|
| `supabase/clickhouse_pg_sync_schema.sql` | ClickHouse-managed Postgres에 먼저 적용할 타깃 스키마 |
| `supabase/clickhouse_pg_sync_subscription.sql` | 스키마 적용 후 subscription 생성 템플릿 |

`clickhouse_pg_sync_schema.sql`은 `supabase/schema.sql`에서 다음만 남긴 파일이다.

- enum
- table
- generated column에 필요한 `immutable_array_to_string`
- primary key / unique constraint
- 일부 unique index

의도적으로 제외한 것:

- Supabase Auth/RLS policy
- RPC/보안 함수 대부분
- trigger
- view
- grant/owner/default privilege
- foreign key

FK를 제외한 이유: initial copy 중 테이블 복제 순서 때문에 FK가 먼저 검증되면 실패할 수 있다. 동기화 안정화 후 필요하면 읽기 복제본 검증용으로 별도 추가한다.

## 실행 순서

### 1. 기존 실패 subscription 제거

ClickHouse-managed Postgres에서 실행:

```sql
DROP SUBSCRIPTION IF EXISTS supabase_cdc_sub;
```

정상 drop이 안 되고 remote slot 정리 문제가 생기면, 우선 작업을 멈추고 publisher slot 상태를 확인한다. 무리하게 `slot_name = NONE`으로 떼면 Supabase 쪽 slot이 남을 수 있다.

### 2. 타깃 스키마 적용

```bash
psql "$CLICKHOUSE_PG_ADMIN_URL" \
  -v ON_ERROR_STOP=1 \
  -f supabase/clickhouse_pg_sync_schema.sql
```

적용 후 ClickHouse-managed Postgres에서 확인:

```sql
select count(*)
from information_schema.tables
where table_schema = 'public'
  and table_type = 'BASE TABLE';
```

기대값: `20`

### 3. subscription 재생성

Supabase direct connection 정보를 psql 변수로만 주입한다. 비밀번호를 파일에 쓰지 않는다.

```bash
psql "$CLICKHOUSE_PG_ADMIN_URL" \
  -v ON_ERROR_STOP=1 \
  -v SUPABASE_CONNINFO="host=db.<project-ref>.supabase.co port=5432 dbname=postgres user=postgres password=<secret> sslmode=require" \
  -f supabase/clickhouse_pg_sync_subscription.sql
```

주의:

- Supabase Pooler/Supavisor는 사용하지 않는다.
- direct endpoint `db.<project-ref>.supabase.co:5432`만 사용한다.
- 현재 direct endpoint가 IPv6-only라, ClickHouse-managed Postgres에서 Supabase IPv6로 outbound 접속 가능해야 한다.
- 안 되면 Supabase IPv4 add-on 또는 별도 CDC 도구가 필요하다.

### 4. 상태 확인

```sql
select
  subname,
  subenabled,
  subslotname,
  subpublications
from pg_subscription;
```

```sql
select *
from pg_stat_subscription;
```

```sql
select
  srrelid::regclass as table_name,
  srsubstate
from pg_subscription_rel
order by table_name;
```

상태 해석:

```text
i = initialize
d = data copy
s = synchronized
r = ready / replicating
```

최종적으로 주요 테이블이 `r`로 가야 한다.

### 5. 데이터 검증

ClickHouse-managed Postgres:

```sql
select count(*) from clients;
select count(*) from contracts;
select count(*) from profiles;
select count(*) from deposit_transactions;
```

Supabase 쪽 count와 비교한다.

변경분 테스트:

1. Supabase 운영/스테이징에서 테스트 row 1개 insert/update/delete
2. ClickHouse-managed Postgres에 반영되는지 확인
3. `pg_stat_subscription.last_msg_receipt_time`이 최근인지 확인

## 실패 시 분기

| 실패 | 의미 | 대응 |
|---|---|---|
| `relation ... does not exist` | 타깃 스키마 없이 subscription 생성 | subscription drop -> schema apply -> subscription recreate |
| `No route to host` / timeout | Supabase IPv6 direct endpoint 접근 불가 | Supabase IPv4 add-on 또는 IPv6 가능한 경로 필요 |
| `permission denied for CREATE SUBSCRIPTION` | managed subscriber 권한 부족 | ClickHouse-managed PG 권한/지원 확인, 외부 CDC 도구 검토 |
| 특정 테이블만 `i/d`에서 멈춤 | 초기 copy/제약/컬럼 불일치 | table schema diff 확인 |

## 보안 메모

- 이미 채팅/터미널에 노출된 Supabase DB 비밀번호는 rotate한다.
- connection string, DB password, admin URL은 git에 커밋하지 않는다.
- 이 동기화는 단기 전환 준비/복제본 유지 목적이다. Supabase 백엔드 운영 DB를 즉시 대체하지 않는다.

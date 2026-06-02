# Supabase 스키마 관리 (NxtCloud CRM v2)

## 스키마 정본 (Single Source of Truth)

**`schema.sql` 이 스키마 정본이다.** 운영 DB(`ghuevnxgcdltgupoddsn`) 전체 스키마의 MCP 추출본이며, 신규/staging 환경은 이 파일로 구성한다.

| 파일 | 위상 | 용도 |
| --- | --- | --- |
| **`schema.sql`** | **정본** | 운영 스키마 전체 추출본. 신규 환경 구성의 기준 |
| `staging-seed.sql` | 시드 | staging용 시드 데이터 |
| `staging-cleanup.sql` | 유틸 | staging 테스트 데이터 정리 |
| `migrations/00001~00035` | **역사 기록(동결)** | 증분 마이그레이션. **불완전 — 신규 환경에 사용 금지** |

## 왜 마이그레이션이 아니라 단일 스냅샷인가

이 프로젝트는 supabase CLI 마이그레이션 워크플로(`link` + `db push`)를 쓰지 않는다(`config.toml` 없음). 운영 스키마 변경은 MCP/대시보드로 직접 적용해 왔고, 그 결과:

- 원격 `schema_migrations` 이력 = `00001~00021` + 타임스탬프 버전 8개뿐, 이후 미기록
- 로컬 `migrations/00022~00035` 는 원격 이력에 없고, **세트 자체가 불완전**하다

`migrations/` 가 운영을 재현하지 못하는 확인된 누락분(2026-06-02 감사):

- 테이블: `employees`, `contract_tech_leads`
- enum: `billing_method_type`, `client_status_type`, `company_size_type`, `credit_share_type`, `industry_type`, `msp_grade_type`, `payer_type`
- 함수: `update_contract_teams(uuid, jsonb)`
- 컬럼: `contract_msp_details.root_account_email`, `employees.is_sales_rep`
- 死 정의(운영에 없음): `migrations/00008` 의 `contract_tt_details`

이 모든 것이 `schema.sql` 에는 정확히 반영돼 있다. 그래서 정본은 `schema.sql` 이고, `migrations/` 는 변경 이력 참고용으로만 동결 보존한다.

## 신규 / staging 환경 구성

```
1) 대시보드 SQL 에디터에 schema.sql 전체 paste → Run
2) staging-seed.sql 실행 (시드 데이터)
```

## 스키마 변경 워크플로 (정본 갱신 규율)

증분 마이그레이션 파일을 새로 추가하지 않는다. 대신:

1. 운영 DB에 변경 적용 (MCP `apply_migration` 또는 대시보드)
2. **`schema.sql` 재추출로 정본 갱신**:
   ```
   supabase db dump --schema public > supabase/schema.sql
   ```
   (운영 연결/자격증명 필요. `--schema public` 으로 public 스키마만)
3. 변경 요약을 커밋 메시지에 남긴다

> 향후 supabase CLI 워크플로로 전환하려면: `supabase init` + `link` 후 `schema.sql` 을 단일 baseline 마이그레이션으로 채택하고 원격 `schema_migrations` 를 정리(repair)한다. 운영 이력을 건드리는 작업이라 별도 계획 필요.

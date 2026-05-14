# 리팩토링 서베이 리포트

- **일시**: 2026-04-16
- **대상**: 이번 세션에서 수정한 파일들 (22 files, +1177/-407)
- **목적**: 리팩토링 타겟 발굴 + 우선순위 제안

---

## 🎯 타겟 1: `contract-detail.tsx` (283줄) — **최우선**

### 문제

`handleSave` 하나에 4가지 책임이 뒤섞여 있음:
1. 계약 기본 정보 업데이트
2. MSP 상세 업데이트
3. 담당 기술 업데이트
4. 변경이력 diff 생성 + 기록

특히 **변경이력 diff 로직 (line 100-157)** 이 50줄 이상 if-else 체인으로 전개되어 있음:

```tsx
for (const [key, newVal] of Object.entries(editValues)) {
  let oldVal: string | null = null;
  let displayOld: string | null = null;
  let displayNew: string | null = newVal || null;

  if (key === 'totalAmount') { ... }
  else if (key === 'assignedTo') { ... }
  else if (key === 'memo') { ... }
  else if (key === 'expectedMrr') { ... }
  else if (key === 'awsAmount') { ... }
  else if (key === 'creditShare') { ... }
  else if (key === 'payer') { ... }
  else if (key === 'billingMethod') { ... }
  else if (key === 'billingOnAlias') { ... }
  else if (key === 'tags') { ... }
  else if (key === 'salesRepId') { ... }
  else if (key === 'techLeadIds') { ... }
  // 필드 추가마다 여기에 한 줄씩 ↑
}
```

**새 필드 추가 시**:
- `fieldLabels` 에 추가
- `if (key === 'xxx')` 블록에 추가
- `mspUpdate` / `contractUpdate` 쪽에 추가
- → **3곳 수정 필요, 누락 가능**

### 제안

**A. 필드 메타데이터 중앙화**

```tsx
// src/lib/contracts/field-definitions.ts
type ContractFieldDef = {
  key: string;
  label: string;
  target: 'contract' | 'msp_details' | 'tech_leads';
  dbColumn?: string;
  parse?: (v: string) => unknown;
  format?: (v: unknown) => string | null;
  getOriginal?: (contract: ContractRow) => string | null;
};

export const CONTRACT_FIELDS: ContractFieldDef[] = [
  { key: 'totalAmount', label: '금액', target: 'contract', dbColumn: 'total_amount',
    parse: (v) => safeNumber(v) ?? 0,
    format: (v) => v ? `₩ ${Number(v).toLocaleString()}` : null,
    getOriginal: (c) => String(c.total_amount) },
  { key: 'memo', label: '메모', target: 'contract', dbColumn: 'memo', ... },
  // ...
];
```

**B. `handleSave` 분리**

```tsx
// useContractSave 훅으로 추출
const { saving, save } = useContractSave(contract, currentUser, employees);

async function handleSave() {
  await save(editValues);
  setEditValues({});
  setEditing(false);
}
```

### 예상 효과

- `contract-detail.tsx` 283줄 → ~120줄
- 필드 추가 시 **1곳만 수정** (메타데이터 배열)
- 테스트 용이

### 위험도/작업량

- 위험도: **중** (핵심 저장 로직이라 꼼꼼한 QA 필요)
- 작업량: **2~3시간** (구조 설계 + 테스트)

---

## 🎯 타겟 2: `msp-detail-card.tsx` (304줄) — **중우선**

### 문제

같은 패턴이 **15회 반복**:

```tsx
<div className="space-y-1">
  <p className="text-xs font-medium text-zinc-400">라벨</p>
  {editing ? (
    <Input value={val('field', fallback)} onChange={...} className="h-9" />
  ) : (
    <p className="text-[15px] font-medium text-zinc-900">{value ?? '-'}</p>
  )}
</div>
```

타입별(Input/Select/toggle)로 변형은 있으나 **골조는 동일**. 편집/읽기 모드 분기가 레이아웃 안에 뒤섞여 가독성 저하.

### 제안

**공통 `<FieldCell>` 컴포넌트**

```tsx
<FieldCell label="MSP 등급" editing={editing}>
  <FieldCell.Read>{details?.msp_grade ?? '-'}</FieldCell.Read>
  <FieldCell.EditSelect
    value={val('mspGrade', details?.msp_grade ?? '')}
    onChange={(v) => onFieldChange?.('mspGrade', v)}
    options={MSP_GRADES}
  />
</FieldCell>
```

또는 간결 버전:

```tsx
<FieldCell
  label="MSP 등급"
  editing={editing}
  value={details?.msp_grade}
  edit={{ type: 'select', options: MSP_GRADES, onChange: (v) => onFieldChange?.('mspGrade', v) }}
/>
```

### 예상 효과

- `msp-detail-card.tsx` 304줄 → ~140줄
- 새 필드 추가 시 JSX 6줄 → 2줄
- 다른 detail card(`contract-info-card`, 향후 TT detail 등)에서도 재사용

### 위험도/작업량

- 위험도: **저** (UI만 변경, 로직 영향 없음)
- 작업량: **2시간**

---

## 🎯 타겟 3: 두 리스트 페이지 인라인 편집 중복 — **중우선**

- `/msp/contracts/page.tsx` (649줄)
- `/msp/clients/page.tsx` (340줄)

### 공통 패턴

- `useInlineEdit` 훅은 이미 있음 ✅
- 그런데 **컬럼 정의, 셀 렌더링, 편집 모드 UI** 는 각자 중복
- 특히 `renderEditingCell` / `renderCellValue` / `canEdit` 렌더 로직이 유사

### 제안

**`<DataTableWithInlineEdit>` 또는 렌더 헬퍼 분리**

```tsx
// src/components/common/inline-edit-table.tsx
export function InlineEditTable<T>({
  data,
  columns,
  inlineEdit,
  dynamicOptions,
  onRowClick,
}: Props<T>) { ... }
```

컬럼 정의 스펙에 `type`, `options`, `format`, `dbColumn` 등을 포함시켜 일반화.

### 예상 효과

- 두 페이지에서 각자 200줄+ → 테이블 렌더는 공통 호출 한 번
- 새 리스트 페이지 만들 때 재사용

### 위험도/작업량

- 위험도: **중** (두 페이지 동시 변경)
- 작업량: **3~4시간** (설계 + 양쪽 페이지 마이그레이션)

---

## 🎯 타겟 4: `contract-service.ts` (488줄) — **저우선**

### 문제

- `ContractRow` 인터페이스가 이미 20개 필드
- `getById` 쿼리 셀렉트가 인라인 문자열 (태그 추가 시 실수 가능)
- `updateMspDetails` 내부 if문 체인 (타겟 1과 유사한 패턴)

### 제안

- 쿼리 select를 상수로 분리: `CONTRACT_WITH_DETAILS_SELECT = '...'`
- `updateMspDetails` 를 필드 메타데이터 기반으로 (타겟 1과 같이)

### 위험도/작업량

- 위험도: **저** (내부 리팩토링)
- 작업량: **1~2시간**

---

## 🎯 타겟 5: 마이너 개선

### 5-A. `auth-provider.tsx` — 깨끗함 ✅

방금 수정한 버전은 OK. `useState(() => createClient())` lazy init + 동기 `setUser`. 추가 정리 불필요.

### 5-B. 매직 넘버/문자열

여러 곳에서 하드코딩된 값:
- `'71a0d25f-af45-4389-8734-bc7a118bd2f2'` (MSP팀 ID) — `contract_teams` INSERT 시 사용됐음
- width 값 `'w-[110px]'`, `'w-[120px]'` 등

→ 별도 상수 파일로 빼는 것도 가능. 우선순위 낮음.

### 5-C. 매직 지연 시간 (없는 듯)

useEffect / setTimeout 매직 넘버 특별히 없음. OK.

---

## 📋 우선순위 제안

| 순위 | 타겟 | 효과 | 작업량 | 위험도 |
|---|---|---|---|---|
| 🥇 1 | contract-detail.tsx 필드 메타데이터화 | 높음 | 2-3h | 중 |
| 🥈 2 | msp-detail-card.tsx FieldCell 컴포넌트 | 중 | 2h | 저 |
| 🥉 3 | 리스트 페이지 인라인 편집 공통화 | 중 | 3-4h | 중 |
| 4 | contract-service.ts 정리 | 저 | 1-2h | 저 |
| 5 | 매직 값 상수화 | 저 | 30m | 저 |

## 🚦 진행 제안

### Option A — "가장 큰 임팩트 먼저"
**타겟 1**만 집중 (contract-detail + 필드 메타데이터). 타겟 2, 3은 이어지는 구조 재사용이라 자연스럽게 따라옴.

### Option B — "UI 정리부터"
**타겟 2** (FieldCell) 먼저. 가시적 효과 빠르고 위험도 낮음. 그 후 1, 3.

### Option C — "전부 다 차례로"
1 → 2 → 3 → 4 → 5 순. 하루 전체 투자 필요.

### 내 추천

**B**. 이유:
- FieldCell은 독립적 (다른 파일 영향 없음)
- 성공 확인 후 타겟 1 진행하면 더 깔끔하게 설계 가능
- 위험도 낮아서 빠른 반복 가능

---

## 📌 리팩토링 원칙 (이번 세션)

- **한 번에 하나씩** — 커밋 단위로 격리
- **타입 체크 항상 통과** — 각 타겟 완료 후 `npx tsc --noEmit`
- **기능 동작 확인** — 리팩토링 후 빠른 수동 테스트 (로그인 → 해당 페이지 편집 저장)
- **PR / 커밋 메시지** — `refactor(scope): ...` 형태로 분리

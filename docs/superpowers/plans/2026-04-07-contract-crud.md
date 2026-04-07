# 계약 CRUD 구현 계획 (Plan 2B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계약 도메인의 핵심 CRUD를 구현한다 — 테이블 뷰(MSP/교육), 등록(비즈니스 타입별), 상세/수정, 단계 변경+이력, 삭제. NXT 섹션의 비즈니스 탭(MSP/교육/개발) 구조.

**Architecture:** Plan 2A의 고객 CRUD와 동일 패턴 — 서비스 레이어 + React Query 훅 + Zod 검증. 계약은 통합 모델(contracts + 타입별 확장 테이블)이므로 서비스에서 type에 따라 확장 데이터를 조인/삽입한다. 교육 계약은 운영(education_operations)을 동적으로 추가할 수 있다.

**Tech Stack:** Supabase Client, TanStack React Query 5, Zod, shadcn/ui, Lucide Icons

**Depends on:** Plan 2A (고객 CRUD) — 완료됨

**Scope OUT (Plan 2C):** 칸반 뷰 (dnd-kit), 인라인 편집 모드 (useInlineEdit), 매출 배분 UI, 컬럼 설정/순서

---

## 파일 구조

```
src/
├── lib/
│   ├── validators/
│   │   └── contract.ts               # 계약 Zod 스키마
│   └── services/
│       └── contract-service.ts        # Supabase 계약 CRUD
├── hooks/
│   ├── use-contracts.ts               # 계약 목록 훅
│   ├── use-contract.ts                # 계약 상세 훅
│   ├── use-contract-mutations.ts      # 계약 등록/수정/삭제/단계변경
│   └── use-education-ops.ts           # 교육 운영 CRUD 훅
├── components/
│   └── contracts/
│       ├── contract-table.tsx          # 계약 테이블 (필터+페이지네이션)
│       ├── contract-filters.tsx        # 필터 (비즈니스탭, 단계, 검색)
│       ├── contract-form.tsx           # 등록 폼 (공통 + 비즈니스별 확장)
│       ├── msp-fields.tsx             # MSP 확장 필드
│       ├── edu-fields.tsx             # 교육 확장 필드 + 운영 동적 추가
│       ├── contract-detail.tsx         # 상세 레이아웃 (2열: 정보+사이드)
│       ├── contract-info-card.tsx      # 기본 정보 카드 (뷰/편집)
│       ├── msp-detail-card.tsx        # MSP 확장 정보 카드
│       ├── edu-detail-card.tsx        # 교육 확장 정보 카드
│       ├── edu-operations-table.tsx    # 교육 운영 테이블
│       ├── stage-history.tsx           # 단계 변경 이력 타임라인
│       ├── stage-change-dialog.tsx     # 단계 변경 다이얼로그
│       └── contract-delete-zone.tsx    # 삭제 위험 영역
├── app/
│   └── (authenticated)/
│       └── contracts/
│           ├── page.tsx                # 계약 목록 (비즈니스 탭)
│           ├── new/
│           │   └── page.tsx            # 계약 등록
│           └── [id]/
│               └── page.tsx            # 계약 상세
```

---

## Task 1: 계약 Zod 스키마

**Files:**
- Create: `src/lib/validators/contract.ts`
- Test: `tests/lib/contract-validators.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/contract-validators.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  contractCreateSchema,
  contractUpdateSchema,
  mspDetailSchema,
  eduOperationSchema,
  stageChangeSchema,
  contractListQuerySchema,
} from '@/lib/validators/contract';

describe('contractCreateSchema', () => {
  it('유효한 MSP 계약을 통과시킨다', () => {
    const result = contractCreateSchema.safeParse({
      name: '삼성SDS MSP',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'msp',
      totalAmount: 120000000,
    });
    expect(result.success).toBe(true);
  });

  it('유효한 교육 계약을 통과시킨다', () => {
    const result = contractCreateSchema.safeParse({
      name: 'AWS 교육',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'tt',
      totalAmount: 30000000,
    });
    expect(result.success).toBe(true);
  });

  it('계약명 없으면 거부', () => {
    const result = contractCreateSchema.safeParse({
      name: '',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'msp',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 type 거부', () => {
    const result = contractCreateSchema.safeParse({
      name: '테스트',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('음수 금액 거부', () => {
    const result = contractCreateSchema.safeParse({
      name: '테스트',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'msp',
      totalAmount: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('mspDetailSchema', () => {
  it('MSP 확장 필드를 통과시킨다', () => {
    const result = mspDetailSchema.safeParse({
      billingLevel: 'MSP15',
      creditShare: 15.0,
      expectedMrr: 10000000,
      payer: '삼성SDS',
      salesRep: '박진성',
      awsAmount: 100000000,
      hasManagementFee: true,
    });
    expect(result.success).toBe(true);
  });

  it('모두 선택사항이므로 빈 객체도 통과', () => {
    const result = mspDetailSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('eduOperationSchema', () => {
  it('운영 데이터를 통과시킨다', () => {
    const result = eduOperationSchema.safeParse({
      operationName: 'AWS 기초 1차',
      location: '서울대',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
      contractedCount: 30,
      providesLunch: true,
      providesSnack: false,
    });
    expect(result.success).toBe(true);
  });

  it('운영명 없으면 거부', () => {
    const result = eduOperationSchema.safeParse({
      operationName: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('stageChangeSchema', () => {
  it('단계 변경을 통과시킨다', () => {
    const result = stageChangeSchema.safeParse({
      toStage: 'contracted',
      note: '계약 체결 완료',
    });
    expect(result.success).toBe(true);
  });

  it('단계 없으면 거부', () => {
    const result = stageChangeSchema.safeParse({
      toStage: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('contractListQuerySchema', () => {
  it('기본값 적용', () => {
    const result = contractListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('필터를 허용한다', () => {
    const result = contractListQuerySchema.parse({
      type: 'msp',
      stage: 'contracted',
      search: '삼성',
    });
    expect(result.type).toBe('msp');
    expect(result.stage).toBe('contracted');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/lib/contract-validators.test.ts
```

- [ ] **Step 3: 스키마 구현**

`src/lib/validators/contract.ts`:

```typescript
import { z } from 'zod';

const contractTypeEnum = z.enum(['msp', 'tt', 'dev']);
const currencyEnum = z.enum(['KRW', 'USD']);

export const contractCreateSchema = z.object({
  name: z.string().min(1, '계약명을 입력해주세요').max(200, '최대 200자까지 입력할 수 있습니다'),
  clientId: z.string().uuid('고객을 선택해주세요'),
  type: contractTypeEnum,
  description: z.string().optional().nullable(),
  totalAmount: z.number().int().min(0, '금액은 0 이상이어야 합니다').default(0),
  currency: currencyEnum.default('KRW'),
  stage: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
});

export type ContractCreateInput = z.infer<typeof contractCreateSchema>;

export const contractUpdateSchema = contractCreateSchema.partial().omit({ type: true, clientId: true });
export type ContractUpdateInput = z.infer<typeof contractUpdateSchema>;

export const mspDetailSchema = z.object({
  billingLevel: z.string().optional().nullable(),
  creditShare: z.number().min(0).max(100).optional().nullable(),
  expectedMrr: z.number().int().min(0).optional().nullable(),
  payer: z.string().optional().nullable(),
  salesRep: z.string().optional().nullable(),
  awsAmount: z.number().int().min(0).optional().nullable(),
  hasManagementFee: z.boolean().default(false),
  paymentMethod: z.string().optional().nullable(),
});

export type MspDetailInput = z.infer<typeof mspDetailSchema>;

export const eduOperationSchema = z.object({
  operationName: z.string().min(1, '운영명을 입력해주세요'),
  location: z.string().optional().nullable(),
  targetOrg: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  totalHours: z.number().min(0).optional().nullable(),
  contractedCount: z.number().int().min(0).optional().nullable(),
  recruitedCount: z.number().int().min(0).optional().nullable(),
  actualCount: z.number().int().min(0).optional().nullable(),
  providesLunch: z.boolean().default(false),
  providesSnack: z.boolean().default(false),
});

export type EduOperationInput = z.infer<typeof eduOperationSchema>;

export const stageChangeSchema = z.object({
  toStage: z.string().min(1, '단계를 선택해주세요'),
  note: z.string().optional().nullable(),
});

export type StageChangeInput = z.infer<typeof stageChangeSchema>;

export const contractListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: contractTypeEnum.optional(),
  stage: z.string().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ContractListQuery = z.infer<typeof contractListQuerySchema>;
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/lib/contract-validators.test.ts
```

- [ ] **Step 5: 커밋**

```
feat: 계약/운영 zod 검증 스키마
```

---

## Task 2: 계약 서비스 레이어

**Files:**
- Create: `src/lib/services/contract-service.ts`

- [ ] **Step 1: 서비스 구현**

`src/lib/services/contract-service.ts`:

```typescript
import { createClient } from '@/lib/supabase/client';
import type {
  ContractCreateInput,
  ContractUpdateInput,
  MspDetailInput,
  EduOperationInput,
  StageChangeInput,
  ContractListQuery,
} from '@/lib/validators/contract';

export interface ContractRow {
  id: string;
  contract_id: string;
  client_id: string;
  type: string;
  name: string;
  description: string | null;
  total_amount: number;
  currency: string;
  stage: string | null;
  assigned_to: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // joined
  client_name?: string;
  client_display_id?: string;
  assigned_to_name?: string;
  contact_name?: string;
  // MSP details
  msp_details?: MspDetailRow | null;
  // education details
  tt_details?: TtDetailRow | null;
}

export interface MspDetailRow {
  id: string;
  contract_id: string;
  billing_level: string | null;
  credit_share: number | null;
  expected_mrr: number | null;
  payer: string | null;
  sales_rep: string | null;
  aws_amount: number | null;
  has_management_fee: boolean;
  payment_method: string | null;
}

export interface TtDetailRow {
  id: string;
  contract_id: string;
}

export interface EducationOpRow {
  id: string;
  contract_id: string;
  operation_name: string;
  location: string | null;
  target_org: string | null;
  start_date: string | null;
  end_date: string | null;
  total_hours: number | null;
  contracted_count: number | null;
  recruited_count: number | null;
  actual_count: number | null;
  provides_lunch: boolean;
  provides_snack: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ContractHistoryRow {
  id: string;
  contract_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string;
  note: string | null;
  created_at: string;
  // joined
  changed_by_name?: string;
}

const supabase = createClient();

export const contractService = {
  async list(query: ContractListQuery) {
    const { page, pageSize, search, type, stage, sortBy, sortOrder } = query;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from('contracts')
      .select(`
        *,
        clients!contracts_client_id_fkey(name, client_id),
        profiles!contracts_assigned_to_fkey(name)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (search) {
      q = q.ilike('name', `%${search}%`);
    }
    if (type) {
      q = q.eq('type', type);
    }
    if (stage) {
      q = q.eq('stage', stage);
    }

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      data: (data ?? []) as unknown as ContractRow[],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select(`
        *,
        clients!contracts_client_id_fkey(name, client_id),
        profiles!contracts_assigned_to_fkey(name),
        contacts!contracts_contact_id_fkey(name),
        contract_msp_details(*),
        contract_tt_details(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data as unknown as ContractRow;
  },

  async create(input: ContractCreateInput) {
    const idFn = input.type === 'msp' ? 'generate_msp_contract_id' : 'generate_edu_contract_id';
    const { data: contractId } = await supabase.rpc(idFn);

    const { data, error } = await supabase
      .from('contracts')
      .insert({
        contract_id: contractId as string,
        client_id: input.clientId,
        type: input.type,
        name: input.name,
        description: input.description ?? null,
        total_amount: input.totalAmount,
        currency: input.currency,
        stage: input.stage ?? (input.type === 'msp' ? 'pre_contract' : null),
        assigned_to: input.assignedTo ?? null,
        contact_id: input.contactId ?? null,
      })
      .select()
      .single();

    if (error) throw error;

    // 비즈니스별 확장 테이블 생성
    if (input.type === 'msp') {
      await supabase.from('contract_msp_details').insert({ contract_id: data.id });
    } else if (input.type === 'tt') {
      await supabase.from('contract_tt_details').insert({ contract_id: data.id });
    }

    // 고객 business_types에 자동 추가
    const { data: client } = await supabase
      .from('clients')
      .select('business_types')
      .eq('id', input.clientId)
      .single();

    if (client) {
      const types = client.business_types as string[] ?? [];
      const btType = input.type === 'tt' ? 'tt' : input.type;
      if (!types.includes(btType)) {
        await supabase
          .from('clients')
          .update({ business_types: [...types, btType] })
          .eq('id', input.clientId);
      }
    }

    return data as unknown as ContractRow;
  },

  async update(id: string, input: ContractUpdateInput) {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.totalAmount !== undefined) updateData.total_amount = input.totalAmount;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo;
    if (input.contactId !== undefined) updateData.contact_id = input.contactId;

    const { data, error } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ContractRow;
  },

  async updateMspDetails(contractId: string, input: MspDetailInput) {
    const updateData: Record<string, unknown> = {};
    if (input.billingLevel !== undefined) updateData.billing_level = input.billingLevel;
    if (input.creditShare !== undefined) updateData.credit_share = input.creditShare;
    if (input.expectedMrr !== undefined) updateData.expected_mrr = input.expectedMrr;
    if (input.payer !== undefined) updateData.payer = input.payer;
    if (input.salesRep !== undefined) updateData.sales_rep = input.salesRep;
    if (input.awsAmount !== undefined) updateData.aws_amount = input.awsAmount;
    if (input.hasManagementFee !== undefined) updateData.has_management_fee = input.hasManagementFee;
    if (input.paymentMethod !== undefined) updateData.payment_method = input.paymentMethod;

    const { data, error } = await supabase
      .from('contract_msp_details')
      .update(updateData)
      .eq('contract_id', contractId)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as MspDetailRow;
  },

  async changeStage(contractId: string, input: StageChangeInput, userId: string) {
    // 현재 단계 조회
    const { data: current } = await supabase
      .from('contracts')
      .select('stage')
      .eq('id', contractId)
      .single();

    // 단계 변경
    const { error: updateError } = await supabase
      .from('contracts')
      .update({ stage: input.toStage })
      .eq('id', contractId);

    if (updateError) throw updateError;

    // 이력 기록
    const { error: historyError } = await supabase
      .from('contract_history')
      .insert({
        contract_id: contractId,
        from_stage: current?.stage ?? null,
        to_stage: input.toStage,
        changed_by: userId,
        note: input.note ?? null,
      });

    if (historyError) throw historyError;
  },

  async getHistory(contractId: string) {
    const { data, error } = await supabase
      .from('contract_history')
      .select('*, profiles!contract_history_changed_by_fkey(name)')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as unknown as ContractHistoryRow[];
  },

  async softDelete(id: string) {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('contracts')
      .update({ deleted_at: now })
      .eq('id', id);

    if (error) throw error;

    // 관련 데이터 소프트 삭제
    await supabase.from('contract_teams').update({ deleted_at: now }).eq('contract_id', id);
  },
};

export const educationOpService = {
  async listByContract(contractId: string) {
    const { data, error } = await supabase
      .from('education_operations')
      .select('*')
      .eq('contract_id', contractId)
      .is('deleted_at', null)
      .order('start_date');

    if (error) throw error;
    return (data ?? []) as unknown as EducationOpRow[];
  },

  async create(contractId: string, input: EduOperationInput) {
    const { data, error } = await supabase
      .from('education_operations')
      .insert({
        contract_id: contractId,
        operation_name: input.operationName,
        location: input.location ?? null,
        target_org: input.targetOrg ?? null,
        start_date: input.startDate ?? null,
        end_date: input.endDate ?? null,
        total_hours: input.totalHours ?? null,
        contracted_count: input.contractedCount ?? null,
        recruited_count: input.recruitedCount ?? null,
        actual_count: input.actualCount ?? null,
        provides_lunch: input.providesLunch,
        provides_snack: input.providesSnack,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as EducationOpRow;
  },

  async update(id: string, input: Partial<EduOperationInput>) {
    const updateData: Record<string, unknown> = {};
    if (input.operationName !== undefined) updateData.operation_name = input.operationName;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.targetOrg !== undefined) updateData.target_org = input.targetOrg;
    if (input.startDate !== undefined) updateData.start_date = input.startDate;
    if (input.endDate !== undefined) updateData.end_date = input.endDate;
    if (input.totalHours !== undefined) updateData.total_hours = input.totalHours;
    if (input.contractedCount !== undefined) updateData.contracted_count = input.contractedCount;
    if (input.recruitedCount !== undefined) updateData.recruited_count = input.recruitedCount;
    if (input.actualCount !== undefined) updateData.actual_count = input.actualCount;
    if (input.providesLunch !== undefined) updateData.provides_lunch = input.providesLunch;
    if (input.providesSnack !== undefined) updateData.provides_snack = input.providesSnack;

    const { data, error } = await supabase
      .from('education_operations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as EducationOpRow;
  },

  async softDelete(id: string) {
    const { error } = await supabase
      .from('education_operations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};
```

- [ ] **Step 2: 커밋**

```
feat: 계약/운영 서비스 레이어 (Supabase CRUD + 단계 변경 + 이력)
```

---

## Task 3: React Query 훅

**Files:**
- Create: `src/hooks/use-contracts.ts`
- Create: `src/hooks/use-contract.ts`
- Create: `src/hooks/use-contract-mutations.ts`
- Create: `src/hooks/use-education-ops.ts`

- [ ] **Step 1: 계약 목록 훅**

`src/hooks/use-contracts.ts`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';
import type { ContractListQuery } from '@/lib/validators/contract';

export function useContracts(query: ContractListQuery) {
  return useQuery({
    queryKey: ['contracts', query],
    queryFn: () => contractService.list(query),
  });
}
```

- [ ] **Step 2: 계약 상세 훅**

`src/hooks/use-contract.ts`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';

export function useContract(id: string) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractService.getById(id),
    enabled: !!id,
  });
}

export function useContractHistory(contractId: string) {
  return useQuery({
    queryKey: ['contract-history', contractId],
    queryFn: () => contractService.getHistory(contractId),
    enabled: !!contractId,
  });
}
```

- [ ] **Step 3: 뮤테이션 훅**

`src/hooks/use-contract-mutations.ts`:

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';
import type { ContractCreateInput, ContractUpdateInput, MspDetailInput, StageChangeInput } from '@/lib/validators/contract';
import { toast } from 'sonner';

export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContractCreateInput) => contractService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('계약이 등록되었습니다');
    },
    onError: () => {
      toast.error('계약 등록에 실패했습니다');
    },
  });
}

export function useUpdateContract(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContractUpdateInput) => contractService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('계약 정보가 업데이트되었습니다');
    },
    onError: () => {
      toast.error('계약 수정에 실패했습니다');
    },
  });
}

export function useUpdateMspDetails(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MspDetailInput) => contractService.updateMspDetails(contractId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      toast.success('MSP 정보가 업데이트되었습니다');
    },
    onError: () => {
      toast.error('MSP 정보 수정에 실패했습니다');
    },
  });
}

export function useChangeStage(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, userId }: { input: StageChangeInput; userId: string }) =>
      contractService.changeStage(contractId, input, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract-history', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('단계가 변경되었습니다');
    },
    onError: () => {
      toast.error('단계 변경에 실패했습니다');
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contractService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('계약이 삭제되었습니다');
    },
    onError: () => {
      toast.error('계약 삭제에 실패했습니다');
    },
  });
}
```

- [ ] **Step 4: 교육 운영 훅**

`src/hooks/use-education-ops.ts`:

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { educationOpService } from '@/lib/services/contract-service';
import type { EduOperationInput } from '@/lib/validators/contract';
import { toast } from 'sonner';

export function useEducationOps(contractId: string) {
  return useQuery({
    queryKey: ['education-ops', contractId],
    queryFn: () => educationOpService.listByContract(contractId),
    enabled: !!contractId,
  });
}

export function useCreateEducationOp(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: EduOperationInput) => educationOpService.create(contractId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-ops', contractId] });
      toast.success('운영이 추가되었습니다');
    },
    onError: () => {
      toast.error('운영 추가에 실패했습니다');
    },
  });
}

export function useUpdateEducationOp(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EduOperationInput> }) =>
      educationOpService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-ops', contractId] });
      toast.success('운영 정보가 수정되었습니다');
    },
    onError: () => {
      toast.error('운영 수정에 실패했습니다');
    },
  });
}

export function useDeleteEducationOp(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => educationOpService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-ops', contractId] });
      toast.success('운영이 삭제되었습니다');
    },
    onError: () => {
      toast.error('운영 삭제에 실패했습니다');
    },
  });
}
```

- [ ] **Step 5: 커밋**

```
feat: 계약/운영 react query 훅 (CRUD + 단계변경 + 이력)
```

---

## Task 4: 계약 목록 페이지 (비즈니스 탭 + 테이블)

> **UI 참조:** PRD Section 13 — 비즈니스 탭 MSP|교육|개발, 단계 필터, 검색

**Files:**
- Create: `src/components/contracts/contract-filters.tsx`
- Create: `src/components/contracts/contract-table.tsx`
- Create: `src/app/(authenticated)/contracts/page.tsx`

- [ ] **Step 1: 필터 컴포넌트**

`src/components/contracts/contract-filters.tsx`:

```typescript
'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface ContractFiltersProps {
  contractType: string;
  search: string;
  onSearchChange: (value: string) => void;
  stage: string | undefined;
  onStageChange: (value: string | undefined) => void;
}

export function ContractFilters({
  contractType,
  search,
  onSearchChange,
  stage,
  onStageChange,
}: ContractFiltersProps) {
  const stages = contractType === 'msp' ? MSP_STAGES : EDU_STAGES;

  return (
    <div className="flex items-center gap-3">
      <Select
        value={stage ?? 'all'}
        onValueChange={(v) => onStageChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="전체 단계" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 단계</SelectItem>
          {stages.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="계약명 검색..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Link href="/contracts/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          계약 등록
        </Button>
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: 계약 테이블**

`src/components/contracts/contract-table.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import type { ContractRow } from '@/lib/services/contract-service';

interface ContractTableProps {
  contracts: ContractRow[];
  loading?: boolean;
  contractType: string;
}

function getStageBadge(stage: string | null, type: string) {
  if (!stage) return <Badge variant="outline">미지정</Badge>;
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  const found = stages.find((s) => s.value === stage);
  return <Badge variant="secondary">{found?.label ?? stage}</Badge>;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function ContractTable({ contracts, loading, contractType }: ContractTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>계약 ID</TableHead>
            <TableHead className="w-[250px]">계약명</TableHead>
            <TableHead>고객</TableHead>
            <TableHead>단계</TableHead>
            <TableHead>담당자</TableHead>
            <TableHead className="text-right">금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                등록된 계약이 없습니다
              </TableCell>
            </TableRow>
          ) : (
            contracts.map((contract) => (
              <TableRow
                key={contract.id}
                className="cursor-pointer hover:bg-accent/5"
                onClick={() => router.push(`/contracts/${contract.id}`)}
              >
                <TableCell className="text-muted-foreground">{contract.contract_id}</TableCell>
                <TableCell className="font-medium">{contract.name}</TableCell>
                <TableCell>{contract.client_name ?? '-'}</TableCell>
                <TableCell>{getStageBadge(contract.stage, contractType)}</TableCell>
                <TableCell>{contract.assigned_to_name ?? '-'}</TableCell>
                <TableCell className="text-right">{formatAmount(contract.total_amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: 계약 목록 페이지 (비즈니스 탭)**

`src/app/(authenticated)/contracts/page.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContractFilters } from '@/components/contracts/contract-filters';
import { ContractTable } from '@/components/contracts/contract-table';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useContracts } from '@/hooks/use-contracts';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';

export default function ContractsPage() {
  const [contractType, setContractType] = useState<string>('msp');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stage, setStage] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  // 간단한 디바운스
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, []);

  const { data, isLoading, isError, refetch } = useContracts({
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
    type: contractType as 'msp' | 'tt' | 'dev',
    stage: stage || undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  function handleTabChange(tab: string) {
    setContractType(tab);
    setStage(undefined);
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  }

  if (isError) {
    return <ErrorState message="계약 목록을 불러올 수 없습니다" onRetry={() => refetch()} />;
  }

  return (
    <div>
      <PageHeader title="계약 관리" />

      <Tabs value={contractType} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="msp">MSP</TabsTrigger>
          <TabsTrigger value="tt">교육</TabsTrigger>
          <TabsTrigger value="dev">개발</TabsTrigger>
        </TabsList>

        <div className="mt-4 space-y-4">
          <ContractFilters
            contractType={contractType}
            search={search}
            onSearchChange={handleSearchChange}
            stage={stage}
            onStageChange={(v) => { setStage(v); setPage(1); }}
          />

          <TabsContent value={contractType} className="mt-0">
            <ContractTable
              contracts={data?.data ?? []}
              loading={isLoading}
              contractType={contractType}
            />
          </TabsContent>
        </div>
      </Tabs>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {data.totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 5: 커밋**

```
feat: 계약 목록 페이지 (비즈니스 탭 + 테이블 + 필터)
```

---

## Task 5: 계약 등록 페이지

> **UI 참조:** PRD Section 13 — 비즈니스 타입 선택 → 공통 + 확장 필드

**Files:**
- Create: `src/components/contracts/contract-form.tsx`
- Create: `src/components/contracts/msp-fields.tsx`
- Create: `src/components/contracts/edu-fields.tsx`
- Create: `src/app/(authenticated)/contracts/new/page.tsx`

- [ ] **Step 1: MSP 확장 필드**

`src/components/contracts/msp-fields.tsx`:

```typescript
'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BILLING_LEVELS } from '@/lib/constants';

export function MspFields() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">MSP 상세</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>빌링 레벨</Label>
          <Select name="billingLevel">
            <SelectTrigger>
              <SelectValue placeholder="선택" />
            </SelectTrigger>
            <SelectContent>
              {BILLING_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>크레딧 쉐어 (%)</Label>
          <Input name="creditShare" type="number" step="0.01" placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>예상 MRR (원)</Label>
          <Input name="expectedMrr" type="number" placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label>결제자</Label>
          <Input name="payer" placeholder="결제자명" />
        </div>
        <div className="space-y-2">
          <Label>담당 영업</Label>
          <Input name="salesRep" placeholder="영업 담당자" />
        </div>
        <div className="space-y-2">
          <Label>AWS 금액 (원)</Label>
          <Input name="awsAmount" type="number" placeholder="0" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Label>관리비 유무</Label>
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" name="hasManagementFee" value="true" /> 있음
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" name="hasManagementFee" value="false" defaultChecked /> 없음
          </label>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 교육 확장 필드 (운영 동적 추가)**

`src/components/contracts/edu-fields.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import type { EduOperationInput } from '@/lib/validators/contract';

interface EduFieldsProps {
  operations: EduOperationInput[];
  onOperationsChange: (ops: EduOperationInput[]) => void;
}

const emptyOp: EduOperationInput = {
  operationName: '',
  location: null,
  targetOrg: null,
  startDate: null,
  endDate: null,
  totalHours: null,
  contractedCount: null,
  recruitedCount: null,
  actualCount: null,
  providesLunch: false,
  providesSnack: false,
};

export function EduFields({ operations, onOperationsChange }: EduFieldsProps) {
  function addOperation() {
    onOperationsChange([...operations, { ...emptyOp, operationName: `${operations.length + 1}차` }]);
  }

  function removeOperation(index: number) {
    onOperationsChange(operations.filter((_, i) => i !== index));
  }

  function updateOperation(index: number, field: string, value: unknown) {
    const updated = operations.map((op, i) => {
      if (i !== index) return op;
      return { ...op, [field]: value };
    });
    onOperationsChange(updated);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">교육 운영</h3>
        <Button type="button" variant="outline" size="sm" onClick={addOperation}>
          <Plus className="mr-1 h-3 w-3" />
          운영 추가
        </Button>
      </div>

      {operations.map((op, idx) => (
        <Card key={idx}>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm">운영 {idx + 1}</CardTitle>
            {operations.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOperation(idx)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">운영명 *</Label>
                <Input
                  value={op.operationName}
                  onChange={(e) => updateOperation(idx, 'operationName', e.target.value)}
                  placeholder="운영명"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">교육 장소</Label>
                <Input
                  value={op.location ?? ''}
                  onChange={(e) => updateOperation(idx, 'location', e.target.value || null)}
                  placeholder="장소"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">시작일</Label>
                <Input
                  type="date"
                  value={op.startDate ?? ''}
                  onChange={(e) => updateOperation(idx, 'startDate', e.target.value || null)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">종료일</Label>
                <Input
                  type="date"
                  value={op.endDate ?? ''}
                  onChange={(e) => updateOperation(idx, 'endDate', e.target.value || null)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">계약 인원</Label>
                <Input
                  type="number"
                  value={op.contractedCount ?? ''}
                  onChange={(e) => updateOperation(idx, 'contractedCount', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">총 시간</Label>
                <Input
                  type="number"
                  value={op.totalHours ?? ''}
                  onChange={(e) => updateOperation(idx, 'totalHours', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={op.providesLunch}
                  onCheckedChange={(v) => updateOperation(idx, 'providesLunch', !!v)}
                />
                <Label className="text-xs">{op.providesLunch ? '중식 제공' : '중식 미제공'}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={op.providesSnack}
                  onCheckedChange={(v) => updateOperation(idx, 'providesSnack', !!v)}
                />
                <Label className="text-xs">{op.providesSnack ? '간식 제공' : '간식 미제공'}</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 계약 등록 폼 (공통 + 비즈니스별)**

`src/components/contracts/contract-form.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BUSINESS_TYPES } from '@/lib/constants';
import { contractCreateSchema, mspDetailSchema, type EduOperationInput } from '@/lib/validators/contract';
import { useCreateContract } from '@/hooks/use-contract-mutations';
import { useCreateEducationOp } from '@/hooks/use-education-ops';
import { useClients } from '@/hooks/use-clients';
import { useProfiles } from '@/hooks/use-clients';
import { MspFields } from './msp-fields';
import { EduFields } from './edu-fields';
import { toast } from 'sonner';

export function ContractForm() {
  const router = useRouter();
  const createContract = useCreateContract();
  const { data: clientsData } = useClients({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' });
  const { data: profiles } = useProfiles();
  const [contractType, setContractType] = useState<string>('msp');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [operations, setOperations] = useState<EduOperationInput[]>([
    { operationName: '1차', location: null, targetOrg: null, startDate: null, endDate: null, totalHours: null, contractedCount: null, recruitedCount: null, actualCount: null, providesLunch: false, providesSnack: false },
  ]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get('name') as string,
      clientId: formData.get('clientId') as string,
      type: contractType,
      totalAmount: Number(formData.get('totalAmount') || 0),
      currency: 'KRW',
      description: formData.get('description') as string || null,
      assignedTo: formData.get('assignedTo') as string || null,
    };

    const result = contractCreateSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      const contract = await createContract.mutateAsync(result.data);

      // MSP 확장 데이터 저장
      if (contractType === 'msp') {
        const mspRaw = {
          billingLevel: formData.get('billingLevel') as string || null,
          creditShare: formData.get('creditShare') ? Number(formData.get('creditShare')) : null,
          expectedMrr: formData.get('expectedMrr') ? Number(formData.get('expectedMrr')) : null,
          payer: formData.get('payer') as string || null,
          salesRep: formData.get('salesRep') as string || null,
          awsAmount: formData.get('awsAmount') ? Number(formData.get('awsAmount')) : null,
          hasManagementFee: formData.get('hasManagementFee') === 'true',
        };
        const mspResult = mspDetailSchema.safeParse(mspRaw);
        if (mspResult.success) {
          const { contractService } = await import('@/lib/services/contract-service');
          await contractService.updateMspDetails(contract.id, mspResult.data);
        }
      }

      // 교육 운영 저장
      if (contractType === 'tt' && operations.length > 0) {
        const { educationOpService } = await import('@/lib/services/contract-service');
        for (const op of operations) {
          if (op.operationName) {
            await educationOpService.create(contract.id, op);
          }
        }
      }

      router.push(`/contracts/${contract.id}`);
    } catch {
      toast.error('계약 등록에 실패했습니다');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 비즈니스 타입 선택 */}
      <Tabs value={contractType} onValueChange={setContractType} className="mb-4">
        <TabsList>
          {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {/* 공통 필드 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>계약명 *</Label>
                <Input name="name" placeholder="계약명을 입력하세요" autoFocus />
                {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>고객 *</Label>
                <Select name="clientId">
                  <SelectTrigger>
                    <SelectValue placeholder="고객 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsData?.data?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && <p className="text-sm text-destructive">{errors.clientId}</p>}
              </div>
              <div className="space-y-2">
                <Label>총 금액 (원)</Label>
                <Input name="totalAmount" type="number" placeholder="0" />
                {errors.totalAmount && <p className="text-sm text-destructive">{errors.totalAmount}</p>}
              </div>
              <div className="space-y-2">
                <Label>사내 담당자</Label>
                <Select name="assignedTo">
                  <SelectTrigger>
                    <SelectValue placeholder="담당자 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea name="description" placeholder="계약 설명" rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* 비즈니스별 확장 */}
        {contractType === 'msp' && (
          <Card>
            <CardContent className="pt-6">
              <MspFields />
            </CardContent>
          </Card>
        )}

        {contractType === 'tt' && (
          <Card>
            <CardContent className="pt-6">
              <EduFields operations={operations} onOperationsChange={setOperations} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>취소</Button>
        <Button type="submit" disabled={createContract.isPending}>
          {createContract.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: 등록 페이지**

`src/app/(authenticated)/contracts/new/page.tsx`:

```typescript
'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ContractForm } from '@/components/contracts/contract-form';

export default function NewContractPage() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="새 계약 등록" />
      <ContractForm />
    </div>
  );
}
```

- [ ] **Step 5: shadcn Checkbox 설치**

```bash
npx shadcn@latest add checkbox
```

- [ ] **Step 6: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 7: 커밋**

```
feat: 계약 등록 페이지 (MSP/교육/개발 타입별 + 운영 동적 추가)
```

---

## Task 6: 계약 상세 페이지

> **UI 참조:** PRD Section 13 — 2열 레이아웃 (정보+사이드), 단계 변경, 이력 타임라인

**Files:**
- Create: `src/components/contracts/contract-info-card.tsx`
- Create: `src/components/contracts/msp-detail-card.tsx`
- Create: `src/components/contracts/edu-detail-card.tsx`
- Create: `src/components/contracts/edu-operations-table.tsx`
- Create: `src/components/contracts/stage-history.tsx`
- Create: `src/components/contracts/stage-change-dialog.tsx`
- Create: `src/components/contracts/contract-delete-zone.tsx`
- Create: `src/components/contracts/contract-detail.tsx`
- Create: `src/app/(authenticated)/contracts/[id]/page.tsx`

- [ ] **Step 1: 기본 정보 카드**

`src/components/contracts/contract-info-card.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { MSP_STAGES, EDU_STAGES, BUSINESS_TYPES } from '@/lib/constants';
import { contractUpdateSchema } from '@/lib/validators/contract';
import { useUpdateContract } from '@/hooks/use-contract-mutations';
import type { ContractRow } from '@/lib/services/contract-service';
import { toast } from 'sonner';

interface ContractInfoCardProps {
  contract: ContractRow;
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '미지정';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function ContractInfoCard({ contract }: ContractInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const updateContract = useUpdateContract(contract.id);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get('name') as string,
      totalAmount: Number(formData.get('totalAmount') || 0),
      description: formData.get('description') as string || null,
    };
    const result = contractUpdateSchema.safeParse(raw);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? '입력을 확인해주세요');
      return;
    }
    await updateContract.mutateAsync(result.data);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">계약 정보</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>취소</Button>
              <Button type="submit" size="sm" disabled={updateContract.isPending}>저장</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>계약명</Label>
                <Input name="name" defaultValue={contract.name} />
              </div>
              <div className="space-y-2">
                <Label>금액 (원)</Label>
                <Input name="totalAmount" type="number" defaultValue={contract.total_amount} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Textarea name="description" defaultValue={contract.description ?? ''} rows={2} />
            </div>
          </CardContent>
        </Card>
      </form>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">계약 정보</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-1 h-3 w-3" />
          수정
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">계약 ID</p>
            <p className="text-sm font-medium">{contract.contract_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">비즈니스 타입</p>
            <Badge variant="outline">
              {BUSINESS_TYPES[contract.type as keyof typeof BUSINESS_TYPES] ?? contract.type}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">계약명</p>
            <p className="text-sm font-medium">{contract.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">고객</p>
            <p className="text-sm font-medium">{contract.client_name ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">단계</p>
            <Badge variant="secondary">{getStageLabel(contract.stage, contract.type)}</Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">금액</p>
            <p className="text-sm font-medium">{formatAmount(contract.total_amount)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">담당자</p>
            <p className="text-sm font-medium">{contract.assigned_to_name ?? '-'}</p>
          </div>
        </div>
        {contract.description && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">설명</p>
            <p className="text-sm">{contract.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 단계 변경 다이얼로그 + 이력 타임라인**

`src/components/contracts/stage-change-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import { useChangeStage } from '@/hooks/use-contract-mutations';
import { useCurrentUser } from '@/hooks/use-current-user';

interface StageChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string;
  contractType: string;
  currentStage: string | null;
}

export function StageChangeDialog({ open, onOpenChange, contractId, contractType, currentStage }: StageChangeDialogProps) {
  const [toStage, setToStage] = useState('');
  const [note, setNote] = useState('');
  const changeStage = useChangeStage(contractId);
  const { data: currentUser } = useCurrentUser();
  const stages = contractType === 'msp' ? MSP_STAGES : EDU_STAGES;

  async function handleSubmit() {
    if (!toStage || !currentUser) return;
    await changeStage.mutateAsync({ input: { toStage, note: note || null }, userId: currentUser.id });
    onOpenChange(false);
    setToStage('');
    setNote('');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>단계 변경</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>변경할 단계</Label>
            <Select value={toStage} onValueChange={setToStage}>
              <SelectTrigger><SelectValue placeholder="단계 선택" /></SelectTrigger>
              <SelectContent>
                {stages.filter((s) => s.value !== currentStage).map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>메모 (선택)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="변경 사유" rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={!toStage || changeStage.isPending}>
            {changeStage.isPending ? '변경 중...' : '변경'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

`src/components/contracts/stage-history.tsx`:

```typescript
'use client';

import { useContractHistory } from '@/hooks/use-contract';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';

interface StageHistoryProps {
  contractId: string;
  contractType: string;
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '미지정';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function StageHistory({ contractId, contractType }: StageHistoryProps) {
  const { data: history, isLoading } = useContractHistory(contractId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">변경 이력</CardTitle>
      </CardHeader>
      <CardContent>
        {(!history || history.length === 0) ? (
          <p className="text-sm text-muted-foreground">변경 이력이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 border-l-2 border-border pl-4 pb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {h.from_stage && (
                      <>
                        <Badge variant="outline" className="text-xs">{getStageLabel(h.from_stage, contractType)}</Badge>
                        <span className="text-xs text-muted-foreground">→</span>
                      </>
                    )}
                    <Badge variant="secondary" className="text-xs">{getStageLabel(h.to_stage, contractType)}</Badge>
                  </div>
                  {h.note && <p className="mt-1 text-xs text-muted-foreground">{h.note}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(h as unknown as { profiles: { name: string } }).profiles?.name} · {formatDate(h.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: MSP/교육 상세 카드 + 운영 테이블 + 삭제 영역**

`src/components/contracts/msp-detail-card.tsx`:

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MspDetailRow } from '@/lib/services/contract-service';

interface MspDetailCardProps {
  details: MspDetailRow | null;
}

export function MspDetailCard({ details }: MspDetailCardProps) {
  if (!details) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">MSP 상세</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">빌링 레벨</p>
            <p className="text-sm font-medium">{details.billing_level ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">크레딧 쉐어</p>
            <p className="text-sm font-medium">{details.credit_share != null ? `${details.credit_share}%` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">예상 MRR</p>
            <p className="text-sm font-medium">{details.expected_mrr != null ? `${new Intl.NumberFormat('ko-KR').format(details.expected_mrr)}원` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">결제자</p>
            <p className="text-sm font-medium">{details.payer ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">담당 영업</p>
            <p className="text-sm font-medium">{details.sales_rep ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">AWS 금액</p>
            <p className="text-sm font-medium">{details.aws_amount != null ? `${new Intl.NumberFormat('ko-KR').format(details.aws_amount)}원` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">관리비</p>
            <p className="text-sm font-medium">{details.has_management_fee ? '있음' : '없음'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

`src/components/contracts/edu-detail-card.tsx`:

```typescript
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EduDetailCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">교육 상세</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">교육 계약 전용 필드는 추후 추가됩니다.</p>
      </CardContent>
    </Card>
  );
}
```

`src/components/contracts/edu-operations-table.tsx`:

```typescript
'use client';

import { useEducationOps } from '@/hooks/use-education-ops';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface EduOperationsTableProps {
  contractId: string;
}

export function EduOperationsTable({ contractId }: EduOperationsTableProps) {
  const { data: ops, isLoading } = useEducationOps(contractId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>운영명</TableHead>
            <TableHead>장소</TableHead>
            <TableHead>기간</TableHead>
            <TableHead>인원</TableHead>
            <TableHead>시간</TableHead>
            <TableHead>중식/간식</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!ops || ops.length === 0) ? (
            <TableRow>
              <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">등록된 운영이 없습니다</TableCell>
            </TableRow>
          ) : (
            ops.map((op) => (
              <TableRow key={op.id}>
                <TableCell className="font-medium">{op.operation_name}</TableCell>
                <TableCell>{op.location ?? '-'}</TableCell>
                <TableCell className="text-xs">
                  {op.start_date && op.end_date ? `${op.start_date} ~ ${op.end_date}` : '-'}
                </TableCell>
                <TableCell>{op.contracted_count ?? '-'}</TableCell>
                <TableCell>{op.total_hours ? `${op.total_hours}h` : '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {op.provides_lunch && <Badge variant="secondary" className="text-xs">중식</Badge>}
                    {op.provides_snack && <Badge variant="secondary" className="text-xs">간식</Badge>}
                    {!op.provides_lunch && !op.provides_snack && '-'}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

`src/components/contracts/contract-delete-zone.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useDeleteContract } from '@/hooks/use-contract-mutations';
import { Trash2 } from 'lucide-react';

interface ContractDeleteZoneProps {
  contractId: string;
  contractName: string;
  isSettled: boolean;
}

export function ContractDeleteZone({ contractId, contractName, isSettled }: ContractDeleteZoneProps) {
  const router = useRouter();
  const deleteContract = useDeleteContract();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    await deleteContract.mutateAsync(contractId);
    setConfirmOpen(false);
    router.push('/contracts');
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">계약 삭제</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            이 계약을 삭제하면 관련 매출 배분도 함께 삭제됩니다.
          </p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmOpen(true)}
                    disabled={isSettled}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    삭제
                  </Button>
                </span>
              </TooltipTrigger>
              {isSettled && (
                <TooltipContent>
                  정산 완료된 계약은 삭제할 수 없습니다. 관리자에게 문의하세요.
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="계약 삭제"
        description={`"${contractName}" 계약을 정말 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteContract.isPending}
      />
    </>
  );
}
```

- [ ] **Step 4: 상세 레이아웃 (2열)**

`src/components/contracts/contract-detail.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContractInfoCard } from './contract-info-card';
import { MspDetailCard } from './msp-detail-card';
import { EduDetailCard } from './edu-detail-card';
import { EduOperationsTable } from './edu-operations-table';
import { StageHistory } from './stage-history';
import { StageChangeDialog } from './stage-change-dialog';
import { ContractDeleteZone } from './contract-delete-zone';
import { BUSINESS_TYPES, MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import type { ContractRow } from '@/lib/services/contract-service';
import { ArrowRightLeft } from 'lucide-react';

interface ContractDetailProps {
  contract: ContractRow;
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '미지정';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}

export function ContractDetail({ contract }: ContractDetailProps) {
  const [stageDialogOpen, setStageDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{contract.name}</h1>
          <Badge variant="outline">
            {BUSINESS_TYPES[contract.type as keyof typeof BUSINESS_TYPES]}
          </Badge>
          <Badge variant="secondary">
            {getStageLabel(contract.stage, contract.type)}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => setStageDialogOpen(true)}>
          <ArrowRightLeft className="mr-1 h-3 w-3" />
          단계 변경
        </Button>
      </div>

      {/* 2열 레이아웃 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 왼쪽: 정보 */}
        <div className="col-span-2 space-y-4">
          <ContractInfoCard contract={contract} />

          {contract.type === 'msp' && (
            <MspDetailCard details={contract.msp_details ?? null} />
          )}

          {contract.type === 'tt' && (
            <>
              <EduDetailCard />
              <EduOperationsTable contractId={contract.id} />
            </>
          )}
        </div>

        {/* 오른쪽: 이력 */}
        <div className="space-y-4">
          <StageHistory contractId={contract.id} contractType={contract.type} />
        </div>
      </div>

      {/* 삭제 */}
      <ContractDeleteZone
        contractId={contract.id}
        contractName={contract.name}
        isSettled={contract.stage === 'settled'}
      />

      {/* 단계 변경 다이얼로그 */}
      <StageChangeDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        contractId={contract.id}
        contractType={contract.type}
        currentStage={contract.stage}
      />
    </div>
  );
}
```

- [ ] **Step 5: 상세 페이지**

`src/app/(authenticated)/contracts/[id]/page.tsx`:

```typescript
'use client';

import { useParams } from 'next/navigation';
import { useContract } from '@/hooks/use-contract';
import { ContractDetail } from '@/components/contracts/contract-detail';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: contract, isLoading, isError, refetch } = useContract(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !contract) {
    return <ErrorState message="계약 정보를 불러올 수 없습니다" onRetry={() => refetch()} />;
  }

  return <ContractDetail contract={contract} />;
}
```

- [ ] **Step 6: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 7: 커밋**

```
feat: 계약 상세 페이지 (2열 레이아웃, 단계 변경, 이력, MSP/교육 상세)
```

---

## Task 7: 고객 상세 — 관련 계약 탭 연결

**Files:**
- Modify: `src/components/clients/related-contracts.tsx`

- [ ] **Step 1: 스텁을 실제 구현으로 교체**

`src/components/clients/related-contracts.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useContracts } from '@/hooks/use-contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BUSINESS_TYPES, MSP_STAGES, EDU_STAGES } from '@/lib/constants';

interface RelatedContractsProps {
  clientId: string;
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '미지정';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function RelatedContracts({ clientId }: RelatedContractsProps) {
  const router = useRouter();
  // 해당 고객의 계약만 조회 — 현재 서비스에 clientId 필터가 없으므로 전체 조회 후 필터
  // TODO: 서비스에 clientId 필터 추가 시 개선
  const { data, isLoading } = useContracts({ page: 1, pageSize: 100, sortBy: 'created_at', sortOrder: 'desc' });

  const contracts = data?.data?.filter((c) => c.client_id === clientId) ?? [];

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>계약명</TableHead>
            <TableHead>타입</TableHead>
            <TableHead>단계</TableHead>
            <TableHead>담당자</TableHead>
            <TableHead className="text-right">금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                관련 계약이 없습니다
              </TableCell>
            </TableRow>
          ) : (
            contracts.map((c) => (
              <TableRow key={c.id} className="cursor-pointer hover:bg-accent/5" onClick={() => router.push(`/contracts/${c.id}`)}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {BUSINESS_TYPES[c.type as keyof typeof BUSINESS_TYPES] ?? c.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {getStageLabel(c.stage, c.type)}
                  </Badge>
                </TableCell>
                <TableCell>{c.assigned_to_name ?? '-'}</TableCell>
                <TableCell className="text-right">{formatAmount(c.total_amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 2: 빌드 확인 + 커밋**

```
feat: 고객 상세 — 관련 계약 탭 구현
```

---

## Task 8: 전체 테스트 + 빌드 확인

- [ ] **Step 1: 전체 테스트**

```bash
npx vitest run
```

- [ ] **Step 2: 빌드**

```bash
npm run build
```

- [ ] **Step 3: 커밋**

```
chore: 계약 CRUD 빌드 + 테스트 검증 완료
```

---

## 요약

| Task | 내용 | 핵심 파일 |
|------|------|----------|
| 1 | Zod 스키마 | validators/contract.ts + 테스트 |
| 2 | 서비스 레이어 | services/contract-service.ts |
| 3 | React Query 훅 | use-contracts, use-contract, use-contract-mutations, use-education-ops |
| 4 | 계약 목록 | contracts/page.tsx + 비즈니스 탭 + 테이블 |
| 5 | 계약 등록 | contracts/new + MSP/교육 확장 필드 + 운영 동적 추가 |
| 6 | 계약 상세 | contracts/[id] + 2열 레이아웃 + 단계 변경 + 이력 + 삭제 |
| 7 | 관련 계약 연결 | clients/related-contracts.tsx 실제 구현 |
| 8 | 전체 검증 | 테스트 + 빌드 |

# 고객 CRUD 구현 계획 (Plan 2A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고객 도메인의 전체 CRUD를 구현한다 — 목록(트리뷰), 등록, 상세/수정(탭), 연락처, 삭제. NXT 섹션과 MSP/EDU 섹션 모두에서 사용.

**Architecture:** 서비스 레이어 패턴으로 Supabase 쿼리를 캡슐화하고, React Query 훅으로 서버 상태를 관리한다. 페이지 컴포넌트는 훅을 조합하여 데이터를 표시하고, Zod로 폼 검증한다. URL 쿼리 파라미터(nuqs)로 필터/페이지네이션 상태를 유지한다. UI는 ui_design.pen을 참조한다.

**Tech Stack:** Supabase Client, TanStack React Query 5, Zod, nuqs, shadcn/ui, Lucide Icons

**Depends on:** Foundation (Plan 1) — 완료됨

**UI 참조:** ui_design.pen (Pencil MCP)

---

## 파일 구조

```
src/
├── lib/
│   ├── validators/
│   │   └── client.ts              # 고객/연락처 Zod 스키마
│   └── services/
│       └── client-service.ts      # Supabase 고객 CRUD 쿼리
├── hooks/
│   ├── use-clients.ts             # 고객 목록 React Query 훅
│   ├── use-client.ts              # 고객 상세 React Query 훅
│   ├── use-client-mutations.ts    # 고객 등록/수정/삭제 뮤테이션
│   └── use-contacts.ts            # 연락처 CRUD 훅
├── components/
│   └── clients/
│       ├── client-list-filters.tsx # 필터 (유형, 비즈니스, 검색)
│       ├── client-tree-table.tsx   # 트리뷰 테이블
│       ├── client-form.tsx         # 등록/수정 폼
│       ├── client-info-card.tsx    # 기본 정보 카드 (뷰/편집)
│       ├── client-tabs.tsx         # 상세 탭 컨테이너
│       ├── contact-table.tsx       # 연락처 테이블
│       ├── contact-form-dialog.tsx # 연락처 추가/수정 다이얼로그
│       ├── related-contracts.tsx   # 관련 계약 탭
│       ├── msp-info-tab.tsx        # MSP 정보 탭
│       ├── edu-info-tab.tsx        # 교육 정보 탭
│       └── client-delete-zone.tsx  # 삭제 위험 영역
├── app/
│   └── (authenticated)/
│       └── clients/
│           ├── page.tsx            # 고객 목록
│           ├── new/
│           │   └── page.tsx        # 고객 등록
│           └── [id]/
│               └── page.tsx        # 고객 상세
```

---

## Task 1: 고객 Zod 스키마

**Files:**
- Create: `src/lib/validators/client.ts`
- Test: `tests/lib/client-validators.test.ts`

- [ ] **Step 1: 테스트 작성**

`tests/lib/client-validators.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  clientCreateSchema,
  clientUpdateSchema,
  contactCreateSchema,
  clientListQuerySchema,
} from '@/lib/validators/client';

describe('clientCreateSchema', () => {
  it('유효한 고객 데이터를 통과시킨다', () => {
    const result = clientCreateSchema.safeParse({
      name: '서울대학교',
      clientType: 'univ',
      grade: 'A',
      businessTypes: ['tt'],
      memo: '주요 교육 고객',
    });
    expect(result.success).toBe(true);
  });

  it('고객명 없으면 거부', () => {
    const result = clientCreateSchema.safeParse({
      name: '',
      clientType: 'univ',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 고객 유형 거부', () => {
    const result = clientCreateSchema.safeParse({
      name: '테스트',
      clientType: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('고객명 200자 초과 거부', () => {
    const result = clientCreateSchema.safeParse({
      name: 'a'.repeat(201),
      clientType: 'corp',
    });
    expect(result.success).toBe(false);
  });
});

describe('clientUpdateSchema', () => {
  it('부분 업데이트를 허용한다', () => {
    const result = clientUpdateSchema.safeParse({ name: '변경된 이름' });
    expect(result.success).toBe(true);
  });
});

describe('contactCreateSchema', () => {
  it('이름만 있으면 통과', () => {
    const result = contactCreateSchema.safeParse({ name: '홍길동' });
    expect(result.success).toBe(true);
  });

  it('이름 없으면 거부', () => {
    const result = contactCreateSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('잘못된 이메일 형식 거부', () => {
    const result = contactCreateSchema.safeParse({
      name: '홍길동',
      email: 'not-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('clientListQuerySchema', () => {
  it('기본값 적용', () => {
    const result = clientListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('필터를 허용한다', () => {
    const result = clientListQuerySchema.parse({
      clientType: 'univ',
      businessType: 'msp',
      search: '서울',
    });
    expect(result.clientType).toBe('univ');
    expect(result.businessType).toBe('msp');
    expect(result.search).toBe('서울');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx vitest run tests/lib/client-validators.test.ts
```

Expected: FAIL

- [ ] **Step 3: 스키마 구현**

`src/lib/validators/client.ts`:

```typescript
import { z } from 'zod';

const clientTypeEnum = z.enum(['univ', 'corp', 'govt', 'asso', 'etc']);
const clientGradeEnum = z.enum(['A', 'B', 'C', 'D', 'E']);
const businessTypeEnum = z.enum(['msp', 'tt', 'dev']);

export const clientCreateSchema = z.object({
  name: z.string().min(1, '고객명을 입력해주세요').max(200, '최대 200자까지 입력할 수 있습니다'),
  clientType: clientTypeEnum,
  grade: clientGradeEnum.optional(),
  businessTypes: z.array(businessTypeEnum).default([]),
  parentId: z.string().uuid().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  status: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;

export const clientUpdateSchema = clientCreateSchema.partial();
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;

export const contactCreateSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
});

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;

export const contactUpdateSchema = contactCreateSchema.partial();
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  clientType: clientTypeEnum.optional(),
  businessType: businessTypeEnum.optional(),
  sortBy: z.string().default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx vitest run tests/lib/client-validators.test.ts
```

Expected: PASS

- [ ] **Step 5: 커밋**

```
feat: 고객/연락처 zod 검증 스키마
```

---

## Task 2: 고객 서비스 레이어

**Files:**
- Create: `src/lib/services/client-service.ts`

- [ ] **Step 1: 서비스 구현**

`src/lib/services/client-service.ts`:

```typescript
import { createClient } from '@/lib/supabase/client';
import type { ClientCreateInput, ClientUpdateInput, ClientListQuery } from '@/lib/validators/client';

export interface ClientRow {
  id: string;
  client_id: string;
  name: string;
  client_type: string;
  grade: string | null;
  business_types: string[];
  parent_id: string | null;
  assigned_to: string | null;
  status: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // joined
  parent_name?: string;
  assigned_to_name?: string;
  contract_count?: number;
  children?: ClientRow[];
  primary_contact_name?: string;
}

export interface ContactRow {
  id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  position: string | null;
  role: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const supabase = createClient();

export const clientService = {
  async list(query: ClientListQuery) {
    const { page, pageSize, search, clientType, businessType, sortBy, sortOrder } = query;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = supabase
      .from('clients')
      .select('*, profiles!clients_assigned_to_fkey(name)', { count: 'exact' })
      .is('deleted_at', null)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (search) {
      q = q.ilike('name', `%${search}%`);
    }
    if (clientType) {
      q = q.eq('client_type', clientType);
    }
    if (businessType) {
      q = q.contains('business_types', [businessType]);
    }

    const { data, count, error } = await q;
    if (error) throw error;

    return {
      data: (data ?? []) as unknown as ClientRow[],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        profiles!clients_assigned_to_fkey(name),
        parent:clients!clients_parent_id_fkey(id, name, client_id),
        children:clients!clients_parent_id_fkey(id, name, client_id, client_type, grade, business_types, status)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;
    return data as unknown as ClientRow;
  },

  async create(input: ClientCreateInput) {
    // client_id 자동 생성
    const { data: clientId } = await supabase
      .rpc('generate_client_id', { p_type: input.clientType });

    const { data, error } = await supabase
      .from('clients')
      .insert({
        client_id: clientId,
        name: input.name,
        client_type: input.clientType,
        grade: input.grade ?? null,
        business_types: input.businessTypes,
        parent_id: input.parentId ?? null,
        assigned_to: input.assignedTo ?? null,
        status: input.status ?? null,
        memo: input.memo ?? null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ClientRow;
  },

  async update(id: string, input: ClientUpdateInput) {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.clientType !== undefined) updateData.client_type = input.clientType;
    if (input.grade !== undefined) updateData.grade = input.grade;
    if (input.businessTypes !== undefined) updateData.business_types = input.businessTypes;
    if (input.parentId !== undefined) updateData.parent_id = input.parentId;
    if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.memo !== undefined) updateData.memo = input.memo;

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as ClientRow;
  },

  async softDelete(id: string) {
    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    // 연락처도 소프트 삭제
    await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('client_id', id);
  },

  // 부모 고객 검색 (드롭다운용)
  async searchParents(search: string) {
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, client_id')
      .is('deleted_at', null)
      .is('parent_id', null) // 부모만 (2단계 제한)
      .ilike('name', `%${search}%`)
      .limit(20);

    if (error) throw error;
    return data ?? [];
  },

  // 사내 담당자 목록
  async getProfiles() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role');

    if (error) throw error;
    return data ?? [];
  },
};

export const contactService = {
  async listByClient(clientId: string) {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .order('is_primary', { ascending: false })
      .order('name');

    if (error) throw error;
    return (data ?? []) as ContactRow[];
  },

  async create(clientId: string, input: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        client_id: clientId,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        department: input.department || null,
        position: input.position || null,
        role: input.role || null,
        is_primary: input.isPrimary ?? false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ContactRow;
  },

  async update(id: string, input: Record<string, unknown>) {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.email !== undefined) updateData.email = input.email || null;
    if (input.phone !== undefined) updateData.phone = input.phone || null;
    if (input.department !== undefined) updateData.department = input.department || null;
    if (input.position !== undefined) updateData.position = input.position || null;
    if (input.role !== undefined) updateData.role = input.role || null;
    if (input.isPrimary !== undefined) updateData.is_primary = input.isPrimary;

    const { data, error } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as ContactRow;
  },

  async softDelete(id: string) {
    const { error } = await supabase
      .from('contacts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};
```

- [ ] **Step 2: 커밋**

```
feat: 고객/연락처 서비스 레이어 (Supabase CRUD)
```

---

## Task 3: React Query 훅

**Files:**
- Create: `src/hooks/use-clients.ts`
- Create: `src/hooks/use-client.ts`
- Create: `src/hooks/use-client-mutations.ts`
- Create: `src/hooks/use-contacts.ts`

- [ ] **Step 1: 고객 목록 훅**

`src/hooks/use-clients.ts`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { clientService } from '@/lib/services/client-service';
import type { ClientListQuery } from '@/lib/validators/client';

export function useClients(query: ClientListQuery) {
  return useQuery({
    queryKey: ['clients', query],
    queryFn: () => clientService.list(query),
  });
}

export function useParentSearch(search: string) {
  return useQuery({
    queryKey: ['clients', 'parents', search],
    queryFn: () => clientService.searchParents(search),
    enabled: search.length >= 1,
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: () => clientService.getProfiles(),
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Step 2: 고객 상세 훅**

`src/hooks/use-client.ts`:

```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { clientService } from '@/lib/services/client-service';

export function useClient(id: string) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getById(id),
    enabled: !!id,
  });
}
```

- [ ] **Step 3: 뮤테이션 훅**

`src/hooks/use-client-mutations.ts`:

```typescript
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/lib/services/client-service';
import type { ClientCreateInput, ClientUpdateInput } from '@/lib/validators/client';
import { toast } from 'sonner';

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClientCreateInput) => clientService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('고객이 등록되었습니다');
    },
    onError: () => {
      toast.error('고객 등록에 실패했습니다');
    },
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClientUpdateInput) => clientService.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('고객 정보가 업데이트되었습니다');
    },
    onError: () => {
      toast.error('고객 수정에 실패했습니다');
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => clientService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success('고객이 삭제되었습니다');
    },
    onError: () => {
      toast.error('고객 삭제에 실패했습니다');
    },
  });
}
```

- [ ] **Step 4: 연락처 훅**

`src/hooks/use-contacts.ts`:

```typescript
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactService } from '@/lib/services/client-service';
import type { ContactCreateInput, ContactUpdateInput } from '@/lib/validators/client';
import { toast } from 'sonner';

export function useContacts(clientId: string) {
  return useQuery({
    queryKey: ['contacts', clientId],
    queryFn: () => contactService.listByClient(clientId),
    enabled: !!clientId,
  });
}

export function useCreateContact(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ContactCreateInput) =>
      contactService.create(clientId, input as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', clientId] });
      toast.success('연락처가 추가되었습니다');
    },
    onError: () => {
      toast.error('연락처 추가에 실패했습니다');
    },
  });
}

export function useUpdateContact(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContactUpdateInput }) =>
      contactService.update(id, input as unknown as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', clientId] });
      toast.success('연락처가 수정되었습니다');
    },
    onError: () => {
      toast.error('연락처 수정에 실패했습니다');
    },
  });
}

export function useDeleteContact(clientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => contactService.softDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', clientId] });
      toast.success('연락처가 삭제되었습니다');
    },
    onError: () => {
      toast.error('연락처 삭제에 실패했습니다');
    },
  });
}
```

- [ ] **Step 5: 커밋**

```
feat: 고객/연락처 react query 훅 (CRUD + 캐시 무효화)
```

---

## Task 4: 고객 목록 페이지

> **UI 참조:** ui_design.pen — 고객 목록 화면. 트리뷰, 필터 행, 고객 추가 버튼.

**Files:**
- Create: `src/components/clients/client-list-filters.tsx`
- Create: `src/components/clients/client-tree-table.tsx`
- Create: `src/app/(authenticated)/clients/page.tsx`

- [ ] **Step 1: 필터 컴포넌트**

`src/components/clients/client-list-filters.tsx`:

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
import { CLIENT_TYPES, BUSINESS_TYPES } from '@/lib/constants';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface ClientListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  clientType: string | undefined;
  onClientTypeChange: (value: string | undefined) => void;
  businessType: string | undefined;
  onBusinessTypeChange: (value: string | undefined) => void;
}

export function ClientListFilters({
  search,
  onSearchChange,
  clientType,
  onClientTypeChange,
  businessType,
  onBusinessTypeChange,
}: ClientListFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={clientType ?? 'all'}
        onValueChange={(v) => onClientTypeChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="고객 유형" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 유형</SelectItem>
          {Object.entries(CLIENT_TYPES).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={businessType ?? 'all'}
        onValueChange={(v) => onBusinessTypeChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="비즈니스" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="고객명 검색..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Link href="/clients/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          고객 추가
        </Button>
      </Link>
    </div>
  );
}
```

> 주의: shadcn/ui `Select` 컴포넌트가 설치되지 않았을 수 있음. 없으면 `npx shadcn@latest add select` 실행.

- [ ] **Step 2: 트리뷰 테이블**

`src/components/clients/client-tree-table.tsx`:

```typescript
'use client';

import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { CLIENT_TYPES, BUSINESS_TYPES } from '@/lib/constants';
import type { ClientRow } from '@/lib/services/client-service';

interface ClientTreeTableProps {
  clients: ClientRow[];
  loading?: boolean;
}

export function ClientTreeTable({ clients, loading }: ClientTreeTableProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // 부모-자식 그룹핑
  const parentMap = new Map<string, ClientRow[]>();
  const roots: ClientRow[] = [];

  clients.forEach((client) => {
    if (client.parent_id) {
      const children = parentMap.get(client.parent_id) ?? [];
      children.push(client);
      parentMap.set(client.parent_id, children);
    } else {
      roots.push(client);
    }
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderRow(client: ClientRow, isChild = false) {
    const children = parentMap.get(client.id) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(client.id);

    return (
      <>
        <TableRow
          key={client.id}
          className="cursor-pointer hover:bg-accent/5"
          onClick={() => router.push(`/clients/${client.id}`)}
        >
          <TableCell className={isChild ? 'pl-10' : ''}>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(client.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              )}
              <span className="font-medium">{client.name}</span>
              {hasChildren && (
                <Badge variant="secondary" className="text-xs">
                  상위
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              {client.business_types?.map((bt: string) => (
                <Badge key={bt} variant="outline" className="text-xs">
                  {BUSINESS_TYPES[bt as keyof typeof BUSINESS_TYPES] ?? bt}
                </Badge>
              ))}
            </div>
          </TableCell>
          <TableCell>
            {CLIENT_TYPES[client.client_type as keyof typeof CLIENT_TYPES] ?? client.client_type}
          </TableCell>
          <TableCell>{client.grade ?? '-'}</TableCell>
          <TableCell>
            {(client as unknown as { profiles: { name: string } | null }).profiles?.name ?? '-'}
          </TableCell>
          <TableCell>{client.primary_contact_name ?? '-'}</TableCell>
          <TableCell>{client.contract_count ?? 0}</TableCell>
        </TableRow>
        {isExpanded &&
          children.map((child) => renderRow(child, true))}
      </>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">고객명</TableHead>
            <TableHead className="w-[120px]">비즈니스</TableHead>
            <TableHead className="w-[100px]">유형</TableHead>
            <TableHead className="w-[60px]">등급</TableHead>
            <TableHead className="w-[120px]">사내 담당자</TableHead>
            <TableHead className="w-[120px]">고객사 담당자</TableHead>
            <TableHead className="w-[80px]">계약 수</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roots.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                등록된 고객이 없습니다
              </TableCell>
            </TableRow>
          ) : (
            roots.map((client) => renderRow(client))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
```

- [ ] **Step 3: 고객 목록 페이지**

`src/app/(authenticated)/clients/page.tsx`:

```typescript
'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { ClientListFilters } from '@/components/clients/client-list-filters';
import { ClientTreeTable } from '@/components/clients/client-tree-table';
import { ErrorState } from '@/components/common/error-state';
import { useClients } from '@/hooks/use-clients';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// 디바운스 훅
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const timeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

  const setValueDebounced = useCallback(
    (newValue: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setDebouncedValue(newValue), delay);
    },
    [delay],
  );

  return [debouncedValue, setValueDebounced] as const;
}

export default function ClientsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useDebounce('', SEARCH_DEBOUNCE_MS);
  const [clientType, setClientType] = useState<string | undefined>();
  const [businessType, setBusinessType] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useClients({
    page,
    pageSize: 20,
    search: debouncedSearch || undefined,
    clientType: clientType as 'univ' | 'corp' | 'govt' | 'asso' | 'etc' | undefined,
    businessType: businessType as 'msp' | 'tt' | 'dev' | undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  function handleSearchChange(value: string) {
    setSearch(value);
    setDebouncedSearch(value);
    setPage(1);
  }

  if (isError) {
    return <ErrorState message="고객 목록을 불러올 수 없습니다" onRetry={() => refetch()} />;
  }

  return (
    <div>
      <PageHeader title="고객 관리" />

      <div className="space-y-4">
        <ClientListFilters
          search={search}
          onSearchChange={handleSearchChange}
          clientType={clientType}
          onClientTypeChange={(v) => { setClientType(v); setPage(1); }}
          businessType={businessType}
          onBusinessTypeChange={(v) => { setBusinessType(v); setPage(1); }}
        />

        <ClientTreeTable
          clients={data?.data ?? []}
          loading={isLoading}
        />

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= data.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: shadcn Select 설치 (없으면)**

```bash
npx shadcn@latest add select
```

- [ ] **Step 5: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 6: 커밋**

```
feat: 고객 목록 페이지 (트리뷰, 필터, 페이지네이션)
```

---

## Task 5: 고객 등록 페이지

> **UI 참조:** ui_design.pen — 고객 등록 폼. 고객명(필수), 유형, 등급, 비즈니스 타입, 상위 고객, 담당자, 메모.

**Files:**
- Create: `src/components/clients/client-form.tsx`
- Create: `src/app/(authenticated)/clients/new/page.tsx`

- [ ] **Step 1: 고객 폼 컴포넌트**

`src/components/clients/client-form.tsx`:

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
import { CLIENT_TYPES, CLIENT_GRADES, BUSINESS_TYPES } from '@/lib/constants';
import { clientCreateSchema, type ClientCreateInput } from '@/lib/validators/client';
import { useCreateClient } from '@/hooks/use-client-mutations';
import { useParentSearch, useProfiles } from '@/hooks/use-clients';

export function ClientForm() {
  const router = useRouter();
  const createClient = useCreateClient();
  const { data: profiles } = useProfiles();
  const [parentSearch, setParentSearch] = useState('');
  const { data: parents } = useParentSearch(parentSearch);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw: Record<string, unknown> = {
      name: formData.get('name') as string,
      clientType: formData.get('clientType') as string,
      grade: formData.get('grade') || undefined,
      businessTypes: selectedBusinessTypes,
      parentId: formData.get('parentId') || null,
      assignedTo: formData.get('assignedTo') || null,
      memo: formData.get('memo') || null,
    };

    const result = clientCreateSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const field = String(err.path[0]);
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const data = await createClient.mutateAsync(result.data);
    router.push(`/clients/${data.id}`);
  }

  function toggleBusinessType(type: string) {
    setSelectedBusinessTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>고객 등록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* 고객명 */}
            <div className="space-y-2">
              <Label htmlFor="name">고객명 *</Label>
              <Input id="name" name="name" placeholder="고객명을 입력하세요" autoFocus />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            {/* 고객 유형 */}
            <div className="space-y-2">
              <Label htmlFor="clientType">고객 유형 *</Label>
              <Select name="clientType">
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientType && <p className="text-sm text-destructive">{errors.clientType}</p>}
            </div>

            {/* 등급 */}
            <div className="space-y-2">
              <Label htmlFor="grade">등급</Label>
              <Select name="grade">
                <SelectTrigger>
                  <SelectValue placeholder="등급 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_GRADES.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 사내 담당자 */}
            <div className="space-y-2">
              <Label htmlFor="assignedTo">사내 담당자</Label>
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

          {/* 비즈니스 타입 */}
          <div className="space-y-2">
            <Label>비즈니스 타입</Label>
            <div className="flex gap-2">
              {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
                <Button
                  key={key}
                  type="button"
                  variant={selectedBusinessTypes.includes(key) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleBusinessType(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* 상위 고객 */}
          <div className="space-y-2">
            <Label htmlFor="parentId">상위 고객</Label>
            <Select name="parentId">
              <SelectTrigger>
                <SelectValue placeholder="상위 고객 선택 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                {parents?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.client_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="memo">메모</Label>
            <Textarea id="memo" name="memo" placeholder="메모를 입력하세요" rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button type="submit" disabled={createClient.isPending}>
          {createClient.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 2: 등록 페이지**

`src/app/(authenticated)/clients/new/page.tsx`:

```typescript
'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ClientForm } from '@/components/clients/client-form';

export default function NewClientPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="새 고객 등록" />
      <ClientForm />
    </div>
  );
}
```

- [ ] **Step 3: shadcn Textarea 설치 (없으면)**

```bash
npx shadcn@latest add textarea
```

- [ ] **Step 4: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 5: 커밋**

```
feat: 고객 등록 페이지 (폼 + zod 검증 + 자동 ID 생성)
```

---

## Task 6: 고객 상세 페이지 — 기본 정보 탭

> **UI 참조:** ui_design.pen — 고객 상세. 기본 정보 카드 (뷰/편집), 탭 구조, 삭제 위험 영역.

**Files:**
- Create: `src/components/clients/client-info-card.tsx`
- Create: `src/components/clients/client-tabs.tsx`
- Create: `src/components/clients/client-delete-zone.tsx`
- Create: `src/app/(authenticated)/clients/[id]/page.tsx`

- [ ] **Step 1: 기본 정보 카드 (뷰/편집 전환)**

`src/components/clients/client-info-card.tsx`:

```typescript
'use client';

import { useState } from 'react';
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
import { Pencil } from 'lucide-react';
import { CLIENT_TYPES, CLIENT_GRADES, BUSINESS_TYPES } from '@/lib/constants';
import { clientUpdateSchema } from '@/lib/validators/client';
import { useUpdateClient } from '@/hooks/use-client-mutations';
import type { ClientRow } from '@/lib/services/client-service';
import { toast } from 'sonner';

interface ClientInfoCardProps {
  client: ClientRow;
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const updateClient = useUpdateClient(client.id);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const raw = {
      name: formData.get('name') as string,
      clientType: formData.get('clientType') as string,
      grade: formData.get('grade') || undefined,
      memo: formData.get('memo') || null,
    };

    const result = clientUpdateSchema.safeParse(raw);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? '입력을 확인해주세요');
      return;
    }

    await updateClient.mutateAsync(result.data);
    setEditing(false);
  }

  if (editing) {
    return (
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">기본 정보</CardTitle>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                취소
              </Button>
              <Button type="submit" size="sm" disabled={updateClient.isPending}>
                저장
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>고객사명</Label>
                <Input name="name" defaultValue={client.name} />
              </div>
              <div className="space-y-2">
                <Label>유형</Label>
                <Select name="clientType" defaultValue={client.client_type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CLIENT_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>등급</Label>
                <Select name="grade" defaultValue={client.grade ?? ''}>
                  <SelectTrigger>
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_GRADES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea name="memo" defaultValue={client.memo ?? ''} rows={3} />
            </div>
          </CardContent>
        </Card>
      </form>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">기본 정보</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-1 h-3 w-3" />
          수정
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">고객사명</p>
            <p className="text-sm font-medium">{client.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">유형</p>
            <p className="text-sm font-medium">
              {CLIENT_TYPES[client.client_type as keyof typeof CLIENT_TYPES]}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">등급</p>
            <p className="text-sm font-medium">{client.grade ?? '-'}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">비즈니스 타입</p>
            <p className="text-sm font-medium">
              {client.business_types?.map((bt: string) =>
                BUSINESS_TYPES[bt as keyof typeof BUSINESS_TYPES] ?? bt,
              ).join(', ') || '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">사내 담당자</p>
            <p className="text-sm font-medium">
              {(client as unknown as { profiles: { name: string } | null }).profiles?.name ?? '-'}
            </p>
          </div>
        </div>
        {client.memo && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">메모</p>
            <p className="text-sm">{client.memo}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 삭제 위험 영역**

`src/components/clients/client-delete-zone.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useDeleteClient } from '@/hooks/use-client-mutations';
import { Trash2 } from 'lucide-react';

interface ClientDeleteZoneProps {
  clientId: string;
  clientName: string;
}

export function ClientDeleteZone({ clientId, clientName }: ClientDeleteZoneProps) {
  const router = useRouter();
  const deleteClient = useDeleteClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    await deleteClient.mutateAsync(clientId);
    setConfirmOpen(false);
    router.push('/clients');
  }

  return (
    <>
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg text-destructive">고객 삭제</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            이 고객을 삭제하면 관련 연락처도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-1 h-3 w-3" />
            삭제
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="고객 삭제"
        description={`"${clientName}" 고객을 정말 삭제하시겠습니까? 관련 연락처도 함께 삭제됩니다.`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteClient.isPending}
      />
    </>
  );
}
```

- [ ] **Step 3: 탭 컨테이너**

`src/components/clients/client-tabs.tsx`:

```typescript
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClientInfoCard } from './client-info-card';
import { ContactTable } from './contact-table';
import { RelatedContracts } from './related-contracts';
import { MspInfoTab } from './msp-info-tab';
import { EduInfoTab } from './edu-info-tab';
import { ClientDeleteZone } from './client-delete-zone';
import type { ClientRow } from '@/lib/services/client-service';
import { Badge } from '@/components/ui/badge';

interface ClientTabsProps {
  client: ClientRow;
}

export function ClientTabs({ client }: ClientTabsProps) {
  const isParent = !client.parent_id && ((client as unknown as { children: unknown[] }).children ?? []).length > 0;
  const hasBusinessType = (type: string) => client.business_types?.includes(type);

  // 부모 고객: 기본 정보 + 관련 계약만
  if (isParent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{client.name}</h1>
          <Badge variant="secondary">상위 고객</Badge>
        </div>

        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">기본 정보</TabsTrigger>
            <TabsTrigger value="contracts">관련 계약</TabsTrigger>
          </TabsList>
          <TabsContent value="info" className="space-y-6">
            <ClientInfoCard client={client} />
            {/* 하위 고객 테이블은 여기에 추가 (기본 정보 탭 내) */}
          </TabsContent>
          <TabsContent value="contracts">
            <RelatedContracts clientId={client.id} />
          </TabsContent>
        </Tabs>

        <ClientDeleteZone clientId={client.id} clientName={client.name} />
      </div>
    );
  }

  // 자식/일반 고객: 전체 탭
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{client.name}</h1>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">기본 정보</TabsTrigger>
          <TabsTrigger value="contacts">연락처</TabsTrigger>
          {hasBusinessType('msp') && <TabsTrigger value="msp">MSP 정보</TabsTrigger>}
          {hasBusinessType('tt') && <TabsTrigger value="edu">교육 정보</TabsTrigger>}
          <TabsTrigger value="contracts">관련 계약</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <ClientInfoCard client={client} />
        </TabsContent>

        <TabsContent value="contacts">
          <ContactTable clientId={client.id} />
        </TabsContent>

        {hasBusinessType('msp') && (
          <TabsContent value="msp">
            <MspInfoTab clientId={client.id} />
          </TabsContent>
        )}

        {hasBusinessType('tt') && (
          <TabsContent value="edu">
            <EduInfoTab clientId={client.id} />
          </TabsContent>
        )}

        <TabsContent value="contracts">
          <RelatedContracts clientId={client.id} />
        </TabsContent>
      </Tabs>

      <ClientDeleteZone clientId={client.id} clientName={client.name} />
    </div>
  );
}
```

- [ ] **Step 4: 스텁 컴포넌트 (나머지 탭)**

`src/components/clients/contact-table.tsx`:

```typescript
'use client';

import { useContacts } from '@/hooks/use-contacts';
import { DataTable, type Column } from '@/components/common/data-table';
import type { ContactRow } from '@/lib/services/client-service';

const columns: Column<ContactRow>[] = [
  { key: 'name', header: '이름' },
  { key: 'department', header: '부서' },
  { key: 'position', header: '직책' },
  { key: 'phone', header: '전화' },
  { key: 'email', header: '이메일' },
];

interface ContactTableProps {
  clientId: string;
}

export function ContactTable({ clientId }: ContactTableProps) {
  const { data: contacts, isLoading } = useContacts(clientId);

  return (
    <DataTable<ContactRow & Record<string, unknown>>
      columns={columns as Column<ContactRow & Record<string, unknown>>[]}
      data={(contacts ?? []) as (ContactRow & Record<string, unknown>)[]}
      loading={isLoading}
      emptyMessage="등록된 연락처가 없습니다"
    />
  );
}
```

`src/components/clients/related-contracts.tsx`:

```typescript
'use client';

interface RelatedContractsProps {
  clientId: string;
}

export function RelatedContracts({ clientId }: RelatedContractsProps) {
  // Plan 2B에서 구현
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      관련 계약은 Plan 2B에서 구현됩니다.
    </p>
  );
}
```

`src/components/clients/msp-info-tab.tsx`:

```typescript
'use client';

interface MspInfoTabProps {
  clientId: string;
}

export function MspInfoTab({ clientId }: MspInfoTabProps) {
  // MSP 정보 상세 구현은 Plan 2B에서
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      MSP 정보는 Plan 2B에서 구현됩니다.
    </p>
  );
}
```

`src/components/clients/edu-info-tab.tsx`:

```typescript
'use client';

interface EduInfoTabProps {
  clientId: string;
}

export function EduInfoTab({ clientId }: EduInfoTabProps) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      교육 정보는 Plan 2B에서 구현됩니다.
    </p>
  );
}
```

- [ ] **Step 5: 상세 페이지**

`src/app/(authenticated)/clients/[id]/page.tsx`:

```typescript
'use client';

import { use } from 'react';
import { useClient } from '@/hooks/use-client';
import { ClientTabs } from '@/components/clients/client-tabs';
import { ErrorState } from '@/components/common/error-state';
import { Skeleton } from '@/components/ui/skeleton';

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: client, isLoading, isError, refetch } = useClient(id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !client) {
    return <ErrorState message="고객 정보를 불러올 수 없습니다" onRetry={() => refetch()} />;
  }

  return <ClientTabs client={client} />;
}
```

- [ ] **Step 6: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 7: 커밋**

```
feat: 고객 상세 페이지 (기본 정보 뷰/편집, 연락처, 탭, 삭제)
```

---

## Task 7: 연락처 추가/수정 다이얼로그

**Files:**
- Create: `src/components/clients/contact-form-dialog.tsx`
- Modify: `src/components/clients/contact-table.tsx`

- [ ] **Step 1: 연락처 폼 다이얼로그**

`src/components/clients/contact-form-dialog.tsx`:

```typescript
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { contactCreateSchema, type ContactCreateInput } from '@/lib/validators/client';
import type { ContactRow } from '@/lib/services/client-service';

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ContactCreateInput) => Promise<void>;
  defaultValues?: Partial<ContactRow>;
  loading?: boolean;
}

export function ContactFormDialog({
  open,
  onOpenChange,
  onSubmit,
  defaultValues,
  loading,
}: ContactFormDialogProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEditing = !!defaultValues?.id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      department: formData.get('department') as string,
      position: formData.get('position') as string,
      role: formData.get('role') as string,
      isPrimary: false,
    };

    const result = contactCreateSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    await onSubmit(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? '연락처 수정' : '연락처 추가'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact-name">이름 *</Label>
            <Input id="contact-name" name="name" defaultValue={defaultValues?.name ?? ''} />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-dept">부서</Label>
              <Input id="contact-dept" name="department" defaultValue={defaultValues?.department ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-pos">직책</Label>
              <Input id="contact-pos" name="position" defaultValue={defaultValues?.position ?? ''} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact-phone">전화</Label>
              <Input id="contact-phone" name="phone" defaultValue={defaultValues?.phone ?? ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">이메일</Label>
              <Input id="contact-email" name="email" type="email" defaultValue={defaultValues?.email ?? ''} />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact-role">역할</Label>
            <Input id="contact-role" name="role" placeholder="기술담당, 결제자 등" defaultValue={defaultValues?.role ?? ''} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={loading}>{loading ? '저장 중...' : '저장'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 연락처 테이블 업데이트 (추가/수정/삭제 버튼)**

`src/components/clients/contact-table.tsx` 전체 교체:

```typescript
'use client';

import { useState } from 'react';
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact } from '@/hooks/use-contacts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ContactFormDialog } from './contact-form-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { ContactRow } from '@/lib/services/client-service';
import type { ContactCreateInput } from '@/lib/validators/client';

interface ContactTableProps {
  clientId: string;
}

export function ContactTable({ clientId }: ContactTableProps) {
  const { data: contacts, isLoading } = useContacts(clientId);
  const createContact = useCreateContact(clientId);
  const updateContact = useUpdateContact(clientId);
  const deleteContact = useDeleteContact(clientId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactRow | null>(null);

  async function handleCreate(data: ContactCreateInput) {
    await createContact.mutateAsync(data);
  }

  async function handleUpdate(data: ContactCreateInput) {
    if (!editingContact) return;
    await updateContact.mutateAsync({ id: editingContact.id, input: data });
    setEditingContact(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteContact.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          연락처 추가
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>부서</TableHead>
              <TableHead>직책</TableHead>
              <TableHead>전화</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!contacts || contacts.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  등록된 연락처가 없습니다
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.department ?? '-'}</TableCell>
                  <TableCell>{contact.position ?? '-'}</TableCell>
                  <TableCell>{contact.phone ?? '-'}</TableCell>
                  <TableCell>{contact.email ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingContact(contact)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setDeleteTarget(contact)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 추가 다이얼로그 */}
      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreate}
        loading={createContact.isPending}
      />

      {/* 수정 다이얼로그 */}
      {editingContact && (
        <ContactFormDialog
          open={!!editingContact}
          onOpenChange={() => setEditingContact(null)}
          onSubmit={handleUpdate}
          defaultValues={editingContact}
          loading={updateContact.isPending}
        />
      )}

      {/* 삭제 확인 */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="연락처 삭제"
        description={`"${deleteTarget?.name}" 연락처를 삭제하시겠습니까?`}
        confirmLabel="삭제"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteContact.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 3: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 4: 커밋**

```
feat: 연락처 CRUD (추가/수정/삭제 다이얼로그)
```

---

## Task 8: 전체 테스트 + 빌드 확인

- [ ] **Step 1: 전체 테스트**

```bash
npx vitest run
```

Expected: 모든 테스트 PASS

- [ ] **Step 2: 린트**

```bash
npm run lint
```

- [ ] **Step 3: 빌드**

```bash
rm -rf .next && npm run build
```

- [ ] **Step 4: 커밋**

```
chore: 고객 CRUD 빌드 + 테스트 검증 완료
```

---

## 요약

| Task | 내용 | 핵심 파일 |
|------|------|----------|
| 1 | Zod 스키마 | validators/client.ts + 테스트 |
| 2 | 서비스 레이어 | services/client-service.ts |
| 3 | React Query 훅 | use-clients, use-client, use-client-mutations, use-contacts |
| 4 | 고객 목록 | clients/page.tsx + 트리뷰 + 필터 |
| 5 | 고객 등록 | clients/new/page.tsx + client-form |
| 6 | 고객 상세 | clients/[id]/page.tsx + 탭 + 기본 정보 + 삭제 |
| 7 | 연락처 CRUD | contact-table + contact-form-dialog |
| 8 | 전체 검증 | 테스트 + 빌드 |

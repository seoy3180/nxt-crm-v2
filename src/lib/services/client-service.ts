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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q = (supabase as any)
      .from('client_list_view')
      .select('*', { count: 'exact' })
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
    // 기본 정보 + 부모 조회
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    // 부모 정보 별도 조회
    let parent = null;
    if (data.parent_id) {
      const { data: parentData } = await supabase
        .from('clients')
        .select('id, name, client_id')
        .eq('id', data.parent_id)
        .single();
      parent = parentData;
    }

    // 자식 고객 별도 조회
    const { data: children } = await supabase
      .from('clients')
      .select('id, name, client_id, client_type, grade, business_types, status')
      .eq('parent_id', id)
      .is('deleted_at', null);

    return { ...data, parent, children: children ?? [] } as unknown as ClientRow;
  },

  async create(input: ClientCreateInput) {
    // client_id 자동 생성
    const { data: clientId } = await supabase
      .rpc('generate_client_id', { p_type: input.clientType });

    const { data, error } = await supabase
      .from('clients')
      .insert({
        client_id: clientId as string,
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
    // assigned_to 컬럼 삭제됨
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
        name: input.name as string,
        email: (input.email as string | null | undefined) || null,
        phone: (input.phone as string | null | undefined) || null,
        department: (input.department as string | null | undefined) || null,
        position: (input.position as string | null | undefined) || null,
        role: (input.role as string | null | undefined) || null,
        is_primary: (input.isPrimary as boolean | undefined) ?? false,
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

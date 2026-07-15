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
  memo: string | null;
  total_amount: number;
  currency: string;
  stage: string | null;
  assigned_to: string | null;
  contact_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  client_name?: string;
  client_display_id?: string;
  assigned_to_name?: string;
  contact_name?: string;
  client_contact_name?: string;
  msp_details?: MspDetailRow | null;
  tt_details?: TtDetailRow | null;
  tech_leads?: TechLeadRow[];
}

export interface TechLeadRow {
  employee_id: string;
  name: string;
}

export interface MspDetailRow {
  id: string;
  contract_id: string;
  credit_share: string | null;
  expected_mrr: number | null;
  payer: string | null;
  sales_rep_id: string | null;
  sales_rep_name: string | null;
  aws_amount: number | null;
  has_management_fee: boolean;
  billing_method: string | null;
  aws_account_ids: string[] | null;
  aws_am: string | null;
  msp_grade: 'None' | 'FREE' | 'MSP10' | 'MSP15' | 'MSP20' | 'ETC' | null;
  billing_on: boolean;
  billing_on_alias: string | null;
  root_account_email: string | null;
  tags: string[] | null;
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
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  from_stage: string | null;
  to_stage: string | null;
  changed_by: string;
  note: string | null;
  created_at: string;
  changed_by_name?: string;
}

function getClient() { return createClient(); }

export const contractService = {
  async list(query: ContractListQuery) {
    const { page, pageSize, search, type, stage, sortBy, sortOrder } = query;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let q = getClient()
      .from('contracts')
      .select(`
        *,
        clients!contracts_client_id_fkey(name, client_id),
        employees!contracts_assigned_to_fkey(name),
        contacts!contracts_contact_id_fkey(name)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order(sortBy, { ascending: sortOrder === 'asc' });

    if (type) q = q.eq('type', type);
    if (stage) q = q.eq('stage', stage);

    // DB 단 검색: 계약명 + 고객명 + AWS account ID 부분매칭(union).
    // `.or()` 문자열 인터폴(PostgREST 메타문자 주입 위험)을 피해, 각 매칭 id를 모은 뒤
    // `.in('id', ids)` 한 절로 합친다. `.ilike()` 값은 PostgREST가 안전하게 파라미터화.
    if (search) {
      const [nameRes, clientHitsRes, accountRes] = await Promise.all([
        getClient()
          .from('contracts')
          .select('id')
          .is('deleted_at', null)
          .ilike('name', `%${search}%`),
        getClient()
          .from('clients')
          .select('id')
          .is('deleted_at', null)
          .ilike('name', `%${search}%`),
        getClient()
          .from('contract_msp_details')
          .select('contract_id')
          .is('deleted_at', null)
          .ilike('aws_account_search', `%${search}%`),
      ]);

      const ids = new Set<string>();
      (nameRes.data ?? []).forEach((r) => ids.add(r.id));
      (accountRes.data ?? []).forEach((r) => ids.add(r.contract_id));

      const clientHitIds = (clientHitsRes.data ?? []).map((r) => r.id);
      if (clientHitIds.length > 0) {
        const { data: byClient } = await getClient()
          .from('contracts')
          .select('id')
          .is('deleted_at', null)
          .in('client_id', clientHitIds);
        (byClient ?? []).forEach((r) => ids.add(r.id));
      }

      if (ids.size === 0) {
        return { data: [], total: 0, page, pageSize, totalPages: 0 };
      }
      q = q.in('id', Array.from(ids));
    }

    q = q.range(from, to);
    const { data, count, error } = await q;
    if (error) throw error;

    const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      client_name: (row.clients as { name: string } | null)?.name ?? null,
      client_display_id: (row.clients as { client_id: string } | null)?.client_id ?? null,
      assigned_to_name: (row.employees as { name: string } | null)?.name ?? null,
      client_contact_name: (row.contacts as { name: string } | null)?.name ?? null,
    }));

    return {
      data: mapped as unknown as ContractRow[],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    };
  },

  async getById(id: string) {
    const { data, error } = await getClient()
      .from('contracts')
      .select(`
        *,
        clients!contracts_client_id_fkey(name, client_id),
        employees!contracts_assigned_to_fkey(name),
        contacts!contracts_contact_id_fkey(name),
        contract_msp_details(*, employees!contract_msp_details_sales_rep_id_fkey(name)),
        contract_tech_leads(employee_id, employees!contract_tech_leads_employee_id_fkey(name))
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    const row = data as Record<string, unknown>;
    const techLeadsRaw = (row.contract_tech_leads ?? []) as Array<{
      employee_id: string;
      employees: { name: string } | null;
    }>;
    const mapped = {
      ...row,
      client_name: (row.clients as { name: string } | null)?.name ?? null,
      client_display_id: (row.clients as { client_id: string } | null)?.client_id ?? null,
      assigned_to_name: (row.employees as { name: string } | null)?.name ?? null,
      contact_name: (row.contacts as { name: string } | null)?.name ?? null,
      msp_details: (() => {
        const raw = Array.isArray(row.contract_msp_details)
          ? (row.contract_msp_details as Record<string, unknown>[])[0] ?? null
          : (row.contract_msp_details as Record<string, unknown> | null) ?? null;
        if (!raw) return null;
        const emp = raw.employees as { name: string } | null;
        return { ...raw, sales_rep_name: emp?.name ?? null, employees: undefined };
      })(),
      tech_leads: techLeadsRaw.map((t) => ({
        employee_id: t.employee_id,
        name: t.employees?.name ?? '',
      })),
    };

    return mapped as unknown as ContractRow;
  },

  async create(input: ContractCreateInput) {
    // 계약 생성 + msp_details 미리 생성 + clients.business_types 보강을 단일 트랜잭션으로 (RPC, 00035).
    // 같은 트랜잭션이라 contracts_select 자기참조 RLS 문제도 자연 해소 (이전 insert+분리 select 트릭 불필요).
    const { data, error } = await getClient().rpc('create_contract_with_details', {
      p_input: {
        client_id: input.clientId,
        type: input.type,
        name: input.name,
        memo: input.memo ?? null,
        total_amount: input.totalAmount,
        currency: input.currency,
        stage: input.stage ?? null,
        assigned_to: input.assignedTo ?? null,
        contact_id: input.contactId ?? null,
      },
    });
    if (error) throw error;
    return data as unknown as ContractRow;
  },

  async update(id: string, input: ContractUpdateInput) {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.memo !== undefined) updateData.memo = input.memo;
    if (input.totalAmount !== undefined) updateData.total_amount = input.totalAmount;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.assignedTo !== undefined) updateData.assigned_to = input.assignedTo;
    if (input.contactId !== undefined) updateData.contact_id = input.contactId;

    const { data, error } = await getClient()
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
    if (input.creditShare !== undefined) updateData.credit_share = input.creditShare;
    if (input.expectedMrr !== undefined) updateData.expected_mrr = input.expectedMrr;
    if (input.payer !== undefined) updateData.payer = input.payer;
    if (input.salesRepId !== undefined) updateData.sales_rep_id = input.salesRepId;
    if (input.awsAmount !== undefined) updateData.aws_amount = input.awsAmount;
    if (input.hasManagementFee !== undefined) updateData.has_management_fee = input.hasManagementFee;
    if (input.billingMethod !== undefined) updateData.billing_method = input.billingMethod;
    if (input.awsAm !== undefined) updateData.aws_am = input.awsAm;
    if (input.awsAccountIds !== undefined) updateData.aws_account_ids = input.awsAccountIds;
    if (input.mspGrade !== undefined) updateData.msp_grade = input.mspGrade;
    if (input.billingOn !== undefined) updateData.billing_on = input.billingOn;
    if (input.billingOnAlias !== undefined) updateData.billing_on_alias = input.billingOnAlias;
    if (input.rootAccountEmail !== undefined) updateData.root_account_email = input.rootAccountEmail;
    if (input.tags !== undefined) updateData.tags = input.tags;

    const { data, error } = await getClient()
      .from('contract_msp_details')
      .update(updateData)
      .eq('contract_id', contractId)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as MspDetailRow;
  },

  /**
   * 담당 기술(다중) 전체 교체.
   * DELETE+INSERT를 단일 트랜잭션으로 묶기 위해 RPC(00035) 호출 — 중간 실패 시 롤백.
   */
  async updateTechLeads(contractId: string, employeeIds: string[]) {
    const { error } = await getClient().rpc('replace_contract_tech_leads', {
      p_contract_id: contractId,
      p_employee_ids: employeeIds,
    });
    if (error) throw error;
  },

  async changeStage(contractId: string, input: StageChangeInput, userId: string) {
    // 단계 UPDATE + history INSERT를 단일 트랜잭션으로 (RPC, 00035).
    const { error } = await getClient().rpc('change_contract_stage', {
      p_contract_id: contractId,
      p_to_stage: input.toStage,
      p_user_id: userId,
      p_note: input.note ?? undefined,
    });
    if (error) throw error;
  },

  /** 범용 변경이력 기록 (여러 필드 동시 가능) */
  async logChanges(
    contractId: string,
    userId: string,
    changes: { field: string; oldValue: string | null; newValue: string | null }[],
  ) {
    if (changes.length === 0) return;

    const rows = changes.map((c) => ({
      contract_id: contractId,
      field_name: c.field,
      old_value: c.oldValue,
      new_value: c.newValue,
      changed_by: userId,
    }));

    const { error } = await getClient().from('contract_history').insert(rows);
    if (error) throw error;
  },

  async getHistory(contractId: string) {
    const { data, error } = await getClient()
      .from('contract_history')
      .select('*, profiles!contract_history_changed_by_fkey(name)')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row) => ({
      ...row,
      changed_by_name: (row.profiles as { name: string } | null)?.name ?? undefined,
    })) as unknown as ContractHistoryRow[];
  },

  async deleteHistoryEntry(historyId: string) {
    const { error } = await getClient()
      .from('contract_history')
      .delete()
      .eq('id', historyId);
    if (error) throw error;
  },

  /**
   * 계약 soft delete.
   *
   * 예치금 잔액 사전 체크 (BIZ-5, Pre-mortem T-2):
   * - 활성 deposit_accounts가 있고 balance != 0이면 차단 후 { blocked }를 반환.
   * - DB 트리거 `guard_contract_delete_with_deposit`이 최종 안전망.
   */
  async softDelete(
    id: string,
  ): Promise<{ blocked?: { balance: number; currency: string } }> {
    // 사전 체크: 예치금 잔액 != 0이면 차단
    const { data: acct } = await getClient()
      .from('deposit_accounts')
      .select('balance, contract:contracts(currency)')
      .eq('contract_id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (acct && acct.balance !== 0) {
      const currency =
        (acct.contract as unknown as { currency: string } | null)?.currency ?? 'KRW';
      return { blocked: { balance: acct.balance, currency } };
    }

    // contracts + 관련 테이블 deleted_at을 단일 트랜잭션으로 (RPC, 00035).
    // DB 트리거 guard_contract_delete_with_deposit이 최종 안전망.
    const { error } = await getClient().rpc('soft_delete_contract', {
      p_contract_id: id,
    });
    if (error) throw error;

    return {};
  },
};

export const educationOpService = {
  async listByContract(contractId: string) {
    const { data, error } = await getClient()
      .from('education_operations')
      .select('*')
      .eq('contract_id', contractId)
      .is('deleted_at', null)
      .order('start_date');

    if (error) throw error;
    return (data ?? []) as unknown as EducationOpRow[];
  },

  async create(contractId: string, input: EduOperationInput) {
    const sortedDates = (input.dates ?? []).sort((a, b) => a.date.localeCompare(b.date));
    const startDate = sortedDates.length > 0 ? sortedDates[0]!.date : null;
    const endDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1]!.date : null;
    const totalHours = sortedDates.reduce((sum, d) => sum + (d.hours ?? 0), 0) || null;

    const { data, error } = await getClient()
      .from('education_operations')
      .insert({
        contract_id: contractId,
        operation_name: input.operationName,
        location: input.location ?? null,
        target_org: input.targetOrg ?? null,
        start_date: startDate,
        end_date: endDate,
        total_hours: totalHours,
        contracted_count: input.contractedCount ?? null,
        recruited_count: input.recruitedCount ?? null,
        actual_count: input.actualCount ?? null,
        provides_lunch: input.providesLunch,
        provides_snack: input.providesSnack,
      })
      .select()
      .single();

    if (error) throw error;

    // 일자별 데이터 저장
    if (sortedDates.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: datesError } = await (getClient() as any)
        .from('education_operation_dates')
        .insert(sortedDates.map((d: { date: string; hours: number }) => ({
          operation_id: data.id,
          education_date: d.date,
          hours: d.hours ?? 0,
        })));
      if (datesError) throw datesError;
    }

    return data as unknown as EducationOpRow;
  },

  async update(id: string, input: Partial<EduOperationInput>) {
    const updateData: Record<string, unknown> = {};
    if (input.operationName !== undefined) updateData.operation_name = input.operationName;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.targetOrg !== undefined) updateData.target_org = input.targetOrg;
    if (input.dates !== undefined) {
      const sortedDates = (input.dates ?? []).sort((a, b) => a.date.localeCompare(b.date));
      updateData.start_date = sortedDates.length > 0 ? sortedDates[0]!.date : null;
      updateData.end_date = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1]!.date : null;
      updateData.total_hours = sortedDates.reduce((sum, d) => sum + (d.hours ?? 0), 0) || null;
    }
    if (input.contractedCount !== undefined) updateData.contracted_count = input.contractedCount;
    if (input.recruitedCount !== undefined) updateData.recruited_count = input.recruitedCount;
    if (input.actualCount !== undefined) updateData.actual_count = input.actualCount;
    if (input.providesLunch !== undefined) updateData.provides_lunch = input.providesLunch;
    if (input.providesSnack !== undefined) updateData.provides_snack = input.providesSnack;

    const { data, error } = await getClient()
      .from('education_operations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as EducationOpRow;
  },

  async softDelete(id: string) {
    const { error } = await getClient()
      .from('education_operations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },
};

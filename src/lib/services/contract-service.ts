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
  client_name?: string;
  client_display_id?: string;
  assigned_to_name?: string;
  contact_name?: string;
  client_contact_name?: string;
  msp_details?: MspDetailRow | null;
  tt_details?: TtDetailRow | null;
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
        profiles!contracts_assigned_to_fkey(name),
        contacts!contracts_contact_id_fkey(name)
      `, { count: 'exact' })
      .is('deleted_at', null)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (type) {
      q = q.eq('type', type);
    }
    if (stage) {
      q = q.eq('stage', stage);
    }

    const { data, count, error } = await q;
    if (error) throw error;

    const mapped = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      client_name: (row.clients as { name: string } | null)?.name ?? null,
      client_display_id: (row.clients as { client_id: string } | null)?.client_id ?? null,
      assigned_to_name: (row.profiles as { name: string } | null)?.name ?? null,
      client_contact_name: (row.contacts as { name: string } | null)?.name ?? null,
    }));

    // 클라이언트에서 계약명 + 고객명 검색
    const filtered = search
      ? mapped.filter((row) => {
          const s = search.toLowerCase();
          const name = String((row as Record<string, unknown>).name ?? '').toLowerCase();
          const clientName = String(row.client_name ?? '').toLowerCase();
          return name.includes(s) || clientName.includes(s);
        })
      : mapped;

    return {
      data: filtered as unknown as ContractRow[],
      total: search ? filtered.length : (count ?? 0),
      page,
      pageSize,
      totalPages: search ? 1 : Math.ceil((count ?? 0) / pageSize),
    };
  },

  async getById(id: string) {
    const { data, error } = await getClient()
      .from('contracts')
      .select(`
        *,
        clients!contracts_client_id_fkey(name, client_id),
        profiles!contracts_assigned_to_fkey(name),
        contacts!contracts_contact_id_fkey(name),
        contract_msp_details(*, employees!contract_msp_details_sales_rep_id_fkey(name))
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    const row = data as Record<string, unknown>;
    const mapped = {
      ...row,
      client_name: (row.clients as { name: string } | null)?.name ?? null,
      client_display_id: (row.clients as { client_id: string } | null)?.client_id ?? null,
      assigned_to_name: (row.profiles as { name: string } | null)?.name ?? null,
      contact_name: (row.contacts as { name: string } | null)?.name ?? null,
      msp_details: (() => {
        const raw = Array.isArray(row.contract_msp_details)
          ? (row.contract_msp_details as Record<string, unknown>[])[0] ?? null
          : (row.contract_msp_details as Record<string, unknown> | null) ?? null;
        if (!raw) return null;
        const emp = raw.employees as { name: string } | null;
        return { ...raw, sales_rep_name: emp?.name ?? null, employees: undefined };
      })(),
    };

    return mapped as unknown as ContractRow;
  },

  async create(input: ContractCreateInput) {
    const idFn = input.type === 'msp' ? 'generate_msp_contract_id' : 'generate_edu_contract_id';
    const { data: contractId } = await getClient().rpc(idFn);

    const { data, error } = await getClient()
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

    if (input.type === 'msp') {
      await getClient().from('contract_msp_details').insert({ contract_id: data.id });
    }

    const { data: client } = await getClient()
      .from('clients')
      .select('business_types')
      .eq('id', input.clientId)
      .single();

    if (client) {
      const types = client.business_types as string[] ?? [];
      const btType = input.type === 'tt' ? 'tt' : input.type;
      if (!types.includes(btType)) {
        await getClient()
          .from('clients')
          .update({ business_types: [...types, btType] as ("msp" | "tt" | "dev")[] })
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

    const { data, error } = await getClient()
      .from('contract_msp_details')
      .update(updateData)
      .eq('contract_id', contractId)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as MspDetailRow;
  },

  async changeStage(contractId: string, input: StageChangeInput, userId: string) {
    const { data: current } = await getClient()
      .from('contracts')
      .select('stage')
      .eq('id', contractId)
      .single();

    const { error: updateError } = await getClient()
      .from('contracts')
      .update({ stage: input.toStage })
      .eq('id', contractId);

    if (updateError) throw updateError;

    const { error: historyError } = await getClient()
      .from('contract_history')
      .insert({
        contract_id: contractId,
        field_name: 'stage',
        old_value: current?.stage ?? null,
        new_value: input.toStage,
        from_stage: current?.stage ?? null,
        to_stage: input.toStage,
        changed_by: userId,
        note: input.note ?? null,
      });

    if (historyError) throw historyError;
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
    return (data ?? []) as unknown as ContractHistoryRow[];
  },

  async softDelete(id: string) {
    const now = new Date().toISOString();

    const { error } = await getClient()
      .from('contracts')
      .update({ deleted_at: now })
      .eq('id', id);

    if (error) throw error;

    await getClient().from('contract_teams').update({ deleted_at: now }).eq('contract_id', id);
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

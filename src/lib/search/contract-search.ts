import { createClient } from '@/lib/supabase/client';
import { toLikePattern, buildIlikeOrClause } from './escape';
import { computeUnionIds, type UnionIdsResult } from './union';
import { SEARCH_FINAL_ID_CAP, SEARCH_SOURCE_ID_CAP } from './constants';

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * 검색어(정규화 완료, non-null)와 매칭되는 계약 id 집합을 계산한다.
 * 소스: 계약명, 고객명(조인), 담당자명(사내담당자·영업담당 조인), 담당연락처명(조인),
 *       MSP 텍스트 3종(루트계정메일·빌링온별칭·AWS담당자), AWS 계정.
 * 각 소스는 소프트삭제(deleted_at IS NULL, employees는 is_active=true)를 적용하고
 * 소스별 SEARCH_SOURCE_ID_CAP으로 중간 수집을 제한하며, 최종 union은 SEARCH_FINAL_ID_CAP으로 제한한다.
 */
export async function getMatchingContractIds(
  supabase: SupabaseClient,
  normalizedSearchTerm: string,
): Promise<UnionIdsResult> {
  const pattern = toLikePattern(normalizedSearchTerm);
  const mspTextOrClause = buildIlikeOrClause(
    ['root_account_email', 'billing_on_alias', 'aws_am'],
    pattern,
  );

  const [nameRes, clientNameRes, employeeNameRes, contactNameRes, mspTextRes, awsRes] =
    await Promise.all([
      supabase
        .from('contracts')
        .select('id')
        .is('deleted_at', null)
        .ilike('name', pattern)
        .limit(SEARCH_SOURCE_ID_CAP),
      supabase
        .from('clients')
        .select('id')
        .is('deleted_at', null)
        .ilike('name', pattern)
        .limit(SEARCH_SOURCE_ID_CAP),
      supabase
        .from('employees')
        .select('id')
        .eq('is_active', true)
        .ilike('name', pattern)
        .limit(SEARCH_SOURCE_ID_CAP),
      supabase
        .from('contacts')
        .select('id')
        .is('deleted_at', null)
        .ilike('name', pattern)
        .limit(SEARCH_SOURCE_ID_CAP),
      supabase
        .from('contract_msp_details')
        .select('contract_id')
        .is('deleted_at', null)
        .or(mspTextOrClause)
        .limit(SEARCH_SOURCE_ID_CAP),
      supabase
        .from('contract_msp_details')
        .select('contract_id')
        .is('deleted_at', null)
        .ilike('aws_account_search', pattern)
        .limit(SEARCH_SOURCE_ID_CAP),
    ]);

  const directIds: string[] = (nameRes.data ?? []).map((r: { id: string }) => r.id);

  const clientIds: string[] = (clientNameRes.data ?? []).map((r: { id: string }) => r.id);
  const employeeIds: string[] = (employeeNameRes.data ?? []).map((r: { id: string }) => r.id);
  const contactIds: string[] = (contactNameRes.data ?? []).map((r: { id: string }) => r.id);

  const emptyIdRes = Promise.resolve({ data: [] as { id: string }[] });
  const emptyContractIdRes = Promise.resolve({ data: [] as { contract_id: string }[] });
  const [byClientRes, byEmployeeRes, byContactRes, bySalesRepRes] = await Promise.all([
    clientIds.length > 0
      ? supabase
          .from('contracts')
          .select('id')
          .is('deleted_at', null)
          .in('client_id', clientIds)
          .limit(SEARCH_SOURCE_ID_CAP)
      : emptyIdRes,
    employeeIds.length > 0
      ? supabase
          .from('contracts')
          .select('id')
          .is('deleted_at', null)
          .in('assigned_to', employeeIds)
          .limit(SEARCH_SOURCE_ID_CAP)
      : emptyIdRes,
    contactIds.length > 0
      ? supabase
          .from('contracts')
          .select('id')
          .is('deleted_at', null)
          .in('contact_id', contactIds)
          .limit(SEARCH_SOURCE_ID_CAP)
      : emptyIdRes,
    employeeIds.length > 0
      ? supabase
          .from('contract_msp_details')
          .select('contract_id')
          .is('deleted_at', null)
          .in('sales_rep_id', employeeIds)
          .limit(SEARCH_SOURCE_ID_CAP)
      : emptyContractIdRes,
  ]);

  const idLists: string[][] = [
    directIds,
    (byClientRes.data ?? []).map((r: { id: string }) => r.id),
    (byEmployeeRes.data ?? []).map((r: { id: string }) => r.id),
    (byContactRes.data ?? []).map((r: { id: string }) => r.id),
    (bySalesRepRes.data ?? []).map((r: { contract_id: string }) => r.contract_id),
    (mspTextRes.data ?? []).map((r: { contract_id: string }) => r.contract_id),
    (awsRes.data ?? []).map((r: { contract_id: string }) => r.contract_id),
  ];

  return computeUnionIds(idLists, SEARCH_FINAL_ID_CAP);
}

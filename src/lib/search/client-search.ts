import { createClient } from '@/lib/supabase/client';
import { toWhitespaceInsensitiveRegexPattern } from './escape';
import { computeUnionIds, type UnionIdsResult } from './union';
import { SEARCH_FINAL_ID_CAP, SEARCH_SOURCE_ID_CAP } from './constants';

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * 검색어(정규화 완료, non-null)와 매칭되는 연락처의 소속 고객 client_id 집합을 계산한다.
 * 대표 여부(is_primary)와 무관하게 소속 연락처 전체가 대상.
 * scopeClientIds를 넘기면 그 범위 내 고객으로만 좁혀 조회한다(예: msp/contacts처럼 MSP 고객만 볼 때).
 */
export async function getClientIdsByContactName(
  supabase: SupabaseClient,
  normalizedSearchTerm: string,
  scopeClientIds?: string[],
): Promise<string[]> {
  const pattern = toWhitespaceInsensitiveRegexPattern(normalizedSearchTerm);

  let q = supabase
    .from('contacts')
    .select('client_id')
    .is('deleted_at', null)
    .regexIMatch('name', pattern);
  if (scopeClientIds) {
    if (scopeClientIds.length === 0) return [];
    q = q.in('client_id', scopeClientIds);
  }
  const { data } = await q.limit(SEARCH_SOURCE_ID_CAP);

  return Array.from(new Set((data ?? []).map((r: { client_id: string }) => r.client_id)));
}

/**
 * 검색어와 매칭되는 고객 id 집합을 계산한다.
 * 소스: 고객명, 소속 연락처명(getClientIdsByContactName), 필요 시 MSP 메모.
 * scopeClientIds를 넘기면 그 범위 내 고객으로만 좁힌다(예: msp/clients처럼 MSP 고객만 볼 때).
 * scopeClientIds가 빈 배열이면 쿼리 없이 즉시 빈 결과를 반환한다.
 */
export async function getMatchingClientIds(
  supabase: SupabaseClient,
  normalizedSearchTerm: string,
  opts: { scopeClientIds?: string[]; includeMspMemo?: boolean } = {},
): Promise<UnionIdsResult> {
  const { scopeClientIds, includeMspMemo = false } = opts;
  if (scopeClientIds && scopeClientIds.length === 0) {
    return { ids: [], truncated: false };
  }

  const pattern = toWhitespaceInsensitiveRegexPattern(normalizedSearchTerm);

  let nameQuery = supabase
    .from('clients')
    .select('id')
    .regexIMatch('name', pattern)
    .limit(SEARCH_SOURCE_ID_CAP);
  if (scopeClientIds) nameQuery = nameQuery.in('id', scopeClientIds);

  let memoQuery = includeMspMemo
    ? supabase
        .from('client_msp_details')
        .select('client_id')
        .regexIMatch('memo', pattern)
        .limit(SEARCH_SOURCE_ID_CAP)
    : null;
  if (memoQuery && scopeClientIds) memoQuery = memoQuery.in('client_id', scopeClientIds);

  const [nameRes, memoRes, contactClientIds] = await Promise.all([
    nameQuery,
    memoQuery ?? Promise.resolve({ data: [] as { client_id: string }[] }),
    getClientIdsByContactName(supabase, normalizedSearchTerm, scopeClientIds),
  ]);

  const idLists: string[][] = [
    (nameRes.data ?? []).map((r: { id: string }) => r.id),
    (memoRes.data ?? []).map((r: { client_id: string }) => r.client_id),
    contactClientIds,
  ];

  return computeUnionIds(idLists, SEARCH_FINAL_ID_CAP);
}

import { createClient } from '@/lib/supabase/client';
import { toLikePattern } from './escape';
import { SEARCH_SOURCE_ID_CAP } from './constants';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const pattern = toLikePattern(normalizedSearchTerm);

  let q = sb.from('contacts').select('client_id').is('deleted_at', null).ilike('name', pattern);
  if (scopeClientIds) {
    if (scopeClientIds.length === 0) return [];
    q = q.in('client_id', scopeClientIds);
  }
  const { data } = await q.limit(SEARCH_SOURCE_ID_CAP);

  return Array.from(new Set((data ?? []).map((r: { client_id: string }) => r.client_id)));
}

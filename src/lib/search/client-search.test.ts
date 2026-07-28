import { describe, it, expect } from 'vitest';
import { createClient } from '@/lib/supabase/client';
import { getClientIdsByContactName, getMatchingClientIds } from './client-search';
import { SEARCH_FINAL_ID_CAP } from './constants';

type SupabaseClient = ReturnType<typeof createClient>;
type Row = Record<string, unknown>;

interface FakeBuilder extends PromiseLike<{ data: Row[] }> {
  select: (...args: unknown[]) => FakeBuilder;
  ilike: (...args: unknown[]) => FakeBuilder;
  is: (...args: unknown[]) => FakeBuilder;
  limit: (...args: unknown[]) => FakeBuilder;
  in: (column: string, values: unknown[]) => FakeBuilder;
}

function createFakeSupabase(tables: Record<string, Row[]>) {
  const fromCalls: string[] = [];
  const inCalls: { table: string; column: string; values: unknown[] }[] = [];

  function makeBuilder(table: string): FakeBuilder {
    const promise: Promise<{ data: Row[] }> = Promise.resolve({ data: tables[table] ?? [] });
    const builder: FakeBuilder = {
      select: () => builder,
      ilike: () => builder,
      is: () => builder,
      limit: () => builder,
      in: (column, values) => {
        inCalls.push({ table, column, values });
        return builder;
      },
      then: promise.then.bind(promise),
    };
    return builder;
  }

  const client = {
    from: (table: string) => {
      fromCalls.push(table);
      return makeBuilder(table);
    },
  } as unknown as SupabaseClient;

  return { client, fromCalls, inCalls };
}

describe('getClientIdsByContactName', () => {
  it('연락처명 매칭 client_id를 중복 제거해 반환한다', async () => {
    const { client } = createFakeSupabase({
      contacts: [{ client_id: 'c1' }, { client_id: 'c2' }, { client_id: 'c1' }],
    });
    const result = await getClientIdsByContactName(client, '김철수');
    expect(new Set(result)).toEqual(new Set(['c1', 'c2']));
  });

  it('scopeClientIds가 빈 배열이면 in() 없이 즉시 빈 배열을 반환한다', async () => {
    const { client, inCalls } = createFakeSupabase({
      contacts: [{ client_id: 'c1' }],
    });
    const result = await getClientIdsByContactName(client, '김철수', []);
    expect(result).toEqual([]);
    expect(inCalls).toEqual([]);
  });

  it('scopeClientIds를 넘기면 in() 필터로 스코프를 좁힌다', async () => {
    const { client, inCalls } = createFakeSupabase({
      contacts: [{ client_id: 'c1' }],
    });
    await getClientIdsByContactName(client, '김철수', ['c1', 'c2']);
    expect(inCalls).toEqual([{ table: 'contacts', column: 'client_id', values: ['c1', 'c2'] }]);
  });
});

describe('getMatchingClientIds', () => {
  it('scopeClientIds가 빈 배열이면 쿼리 없이 빈 결과를 반환한다', async () => {
    const { client, fromCalls } = createFakeSupabase({});
    const result = await getMatchingClientIds(client, '검색어', { scopeClientIds: [] });
    expect(result).toEqual({ ids: [], truncated: false });
    expect(fromCalls).toEqual([]);
  });

  it('includeMspMemo 기본값(false)이면 메모 매치는 결과에서 제외된다', async () => {
    const { client } = createFakeSupabase({
      clients: [{ id: 'c1' }],
      client_msp_details: [{ client_id: 'memo-only' }],
      contacts: [],
    });
    const result = await getMatchingClientIds(client, '검색어');
    expect(result.ids).toEqual(['c1']);
  });

  it('includeMspMemo=true이면 메모 매치도 결과에 포함된다', async () => {
    const { client } = createFakeSupabase({
      clients: [{ id: 'c1' }],
      client_msp_details: [{ client_id: 'memo-only' }],
      contacts: [],
    });
    const result = await getMatchingClientIds(client, '검색어', { includeMspMemo: true });
    expect(new Set(result.ids)).toEqual(new Set(['c1', 'memo-only']));
  });

  it('고객명·메모·연락처명 세 소스를 중복 제거해 합친다', async () => {
    const { client } = createFakeSupabase({
      clients: [{ id: 'c1' }],
      client_msp_details: [{ client_id: 'c1' }, { client_id: 'c2' }],
      contacts: [{ client_id: 'c2' }, { client_id: 'c3' }],
    });
    const result = await getMatchingClientIds(client, '검색어', { includeMspMemo: true });
    expect(new Set(result.ids)).toEqual(new Set(['c1', 'c2', 'c3']));
    expect(result.truncated).toBe(false);
  });

  it('scopeClientIds 지정 시 고객명·메모·연락처명 쿼리 모두에 in() 스코프가 적용된다', async () => {
    const { client, inCalls } = createFakeSupabase({
      clients: [{ id: 'c1' }],
      client_msp_details: [{ client_id: 'c1' }],
      contacts: [{ client_id: 'c1' }],
    });
    await getMatchingClientIds(client, '검색어', {
      scopeClientIds: ['c1', 'c9'],
      includeMspMemo: true,
    });
    expect(inCalls).toEqual([
      { table: 'clients', column: 'id', values: ['c1', 'c9'] },
      { table: 'client_msp_details', column: 'client_id', values: ['c1', 'c9'] },
      { table: 'contacts', column: 'client_id', values: ['c1', 'c9'] },
    ]);
  });

  it('합친 결과가 상한을 초과하면 truncated=true를 전파한다', async () => {
    const manyIds = Array.from({ length: SEARCH_FINAL_ID_CAP + 1 }, (_, i) => ({ id: `c${i}` }));
    const { client } = createFakeSupabase({ clients: manyIds, contacts: [] });
    const result = await getMatchingClientIds(client, '검색어');
    expect(result.ids.length).toBe(SEARCH_FINAL_ID_CAP);
    expect(result.truncated).toBe(true);
  });
});

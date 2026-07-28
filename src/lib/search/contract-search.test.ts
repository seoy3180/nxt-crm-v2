import { describe, it, expect } from 'vitest';
import { createClient } from '@/lib/supabase/client';
import { getMatchingContractIds } from './contract-search';
import { SEARCH_FINAL_ID_CAP } from './constants';

type SupabaseClient = ReturnType<typeof createClient>;
type Row = Record<string, unknown>;

interface FakeBuilder extends PromiseLike<{ data: Row[] }> {
  select: (...args: unknown[]) => FakeBuilder;
  ilike: (column: string, pattern: unknown) => FakeBuilder;
  is: (...args: unknown[]) => FakeBuilder;
  eq: (...args: unknown[]) => FakeBuilder;
  or: (...args: unknown[]) => FakeBuilder;
  in: (column: string, values: unknown[]) => FakeBuilder;
  limit: (...args: unknown[]) => FakeBuilder;
}

/**
 * contracts/contract_msp_details 테이블은 함수 하나에서 여러 번, 서로 다른 필터 컬럼으로 조회된다
 * (예: contracts.name / contracts.client_id / contracts.assigned_to / contracts.contact_id).
 * 그래서 응답을 테이블명이 아니라 "테이블.마지막필터컬럼" 조합(routeKey)으로 분기한다.
 */
function createFakeSupabase(responses: Record<string, Row[]>) {
  const fromCalls: string[] = [];
  const inCalls: { table: string; column: string; values: unknown[] }[] = [];

  function makeBuilder(table: string): FakeBuilder {
    let routeKey = table;
    const builder: FakeBuilder = {
      select: () => builder,
      is: () => builder,
      eq: () => builder,
      or: () => {
        routeKey = `${table}.or`;
        return builder;
      },
      ilike: (column) => {
        routeKey = `${table}.${column}`;
        return builder;
      },
      in: (column, values) => {
        inCalls.push({ table, column, values });
        routeKey = `${table}.${column}`;
        return builder;
      },
      limit: () => builder,
      then: (onfulfilled, onrejected) =>
        Promise.resolve({ data: responses[routeKey] ?? [] }).then(onfulfilled, onrejected),
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

describe('getMatchingContractIds', () => {
  it('계약명 매칭이 결과에 포함된다', async () => {
    const { client } = createFakeSupabase({ 'contracts.name': [{ id: 'c1' }] });
    const result = await getMatchingContractIds(client, '검색어');
    expect(result.ids).toEqual(['c1']);
  });

  it('고객명 매칭 → 해당 고객의 계약이 포함된다', async () => {
    const { client, inCalls } = createFakeSupabase({
      'clients.name': [{ id: 'cl1' }],
      'contracts.client_id': [{ id: 'c2' }],
    });
    const result = await getMatchingContractIds(client, '검색어');
    expect(result.ids).toEqual(['c2']);
    expect(inCalls).toContainEqual({ table: 'contracts', column: 'client_id', values: ['cl1'] });
  });

  it('사내담당자(assigned_to) 이름 매칭이 결과에 포함된다', async () => {
    const { client, inCalls } = createFakeSupabase({
      'employees.name': [{ id: 'e1' }],
      'contracts.assigned_to': [{ id: 'c3' }],
    });
    const result = await getMatchingContractIds(client, '검색어');
    expect(result.ids).toEqual(['c3']);
    expect(inCalls).toContainEqual({ table: 'contracts', column: 'assigned_to', values: ['e1'] });
  });

  it('영업담당(sales_rep_id) 이름 매칭이 결과에 포함된다', async () => {
    const { client, inCalls } = createFakeSupabase({
      'employees.name': [{ id: 'e1' }],
      'contract_msp_details.sales_rep_id': [{ contract_id: 'c4' }],
    });
    const result = await getMatchingContractIds(client, '검색어');
    expect(result.ids).toEqual(['c4']);
    expect(inCalls).toContainEqual({
      table: 'contract_msp_details',
      column: 'sales_rep_id',
      values: ['e1'],
    });
  });

  it('같은 직원 이름이 사내담당자·영업담당 모두에 매칭되면 두 계약 다 포함된다(중복 제거)', async () => {
    const { client } = createFakeSupabase({
      'employees.name': [{ id: 'e1' }],
      'contracts.assigned_to': [{ id: 'c5' }],
      'contract_msp_details.sales_rep_id': [{ contract_id: 'c6' }],
    });
    const result = await getMatchingContractIds(client, '검색어');
    expect(new Set(result.ids)).toEqual(new Set(['c5', 'c6']));
  });

  it('직원 이름이 매칭되지 않으면 assigned_to/sales_rep_id 쿼리를 실행하지 않는다', async () => {
    const { client, inCalls } = createFakeSupabase({ 'employees.name': [] });
    await getMatchingContractIds(client, '검색어');
    expect(inCalls.some((c) => c.column === 'assigned_to')).toBe(false);
    expect(inCalls.some((c) => c.column === 'sales_rep_id')).toBe(false);
  });

  it('고객사담당자(연락처명) 매칭이 결과에 포함된다', async () => {
    const { client, inCalls } = createFakeSupabase({
      'contacts.name': [{ id: 'ct1' }],
      'contracts.contact_id': [{ id: 'c7' }],
    });
    const result = await getMatchingContractIds(client, '검색어');
    expect(result.ids).toEqual(['c7']);
    expect(inCalls).toContainEqual({ table: 'contracts', column: 'contact_id', values: ['ct1'] });
  });

  it('MSP 텍스트(루트계정메일·빌링온별칭·AWS담당자) 매칭이 결과에 포함된다', async () => {
    const { client } = createFakeSupabase({
      'contract_msp_details.or': [{ contract_id: 'c8' }],
    });
    const result = await getMatchingContractIds(client, '검색어');
    expect(result.ids).toEqual(['c8']);
  });

  it('AWS 계정(aws_account_search) 매칭이 결과에 포함된다', async () => {
    const { client } = createFakeSupabase({
      'contract_msp_details.aws_account_search': [{ contract_id: 'c9' }],
    });
    const result = await getMatchingContractIds(client, '검색어');
    expect(result.ids).toEqual(['c9']);
  });

  it('여러 소스의 결과를 중복 제거해 합친다', async () => {
    const { client } = createFakeSupabase({
      'contracts.name': [{ id: 'c1' }],
      'clients.name': [{ id: 'cl1' }],
      'contracts.client_id': [{ id: 'c1' }, { id: 'c2' }],
      'employees.name': [{ id: 'e1' }],
      'contracts.assigned_to': [{ id: 'c2' }],
      'contract_msp_details.sales_rep_id': [{ contract_id: 'c3' }],
    });
    const result = await getMatchingContractIds(client, '검색어');
    expect(new Set(result.ids)).toEqual(new Set(['c1', 'c2', 'c3']));
    expect(result.truncated).toBe(false);
  });

  it('합친 결과가 상한을 초과하면 truncated=true를 전파한다', async () => {
    const manyIds = Array.from({ length: SEARCH_FINAL_ID_CAP + 1 }, (_, i) => ({ id: `c${i}` }));
    const { client } = createFakeSupabase({ 'contracts.name': manyIds });
    const result = await getMatchingContractIds(client, '검색어');
    expect(result.ids.length).toBe(SEARCH_FINAL_ID_CAP);
    expect(result.truncated).toBe(true);
  });
});

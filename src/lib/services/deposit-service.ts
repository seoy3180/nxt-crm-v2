import { createClient } from '@/lib/supabase/client';
import type { DepositAccount, DepositTransaction, DepositTxnType } from '@/lib/deposit/types';

/**
 * 대시보드 카드/KPI 표시용. 계약 + 고객 정보까지 같이 가져온다.
 */
export interface DepositAccountWithContract extends DepositAccount {
  contract: {
    id: string;
    name: string;
    contract_id: string;
    currency: 'KRW' | 'USD';
    client_id: string;
    client_name: string | null;
  };
}

export interface AddTransactionInput {
  account_id: string;
  txn_date: string;
  txn_type: DepositTxnType;
  amount: number;
  memo?: string;
}

export const depositService = {
  /** 활성 계좌 + 계약 정보 전체 조회 (대시보드용). */
  async listAccounts(): Promise<DepositAccountWithContract[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_accounts')
      .select(
        'id, contract_id, balance, total_deposit, total_usage, last_recalc_at, created_at, updated_at, deleted_at, contract:contracts!inner(id, name, contract_id, currency, client_id, clients(name))',
      )
      .is('deleted_at', null);
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      contract_id: row.contract_id,
      balance: row.balance,
      total_deposit: row.total_deposit,
      total_usage: row.total_usage,
      last_recalc_at: row.last_recalc_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      contract: {
        id: row.contract.id,
        name: row.contract.name,
        contract_id: row.contract.contract_id,
        currency: row.contract.currency,
        client_id: row.contract.client_id,
        client_name: row.contract.clients?.name ?? null,
      },
    }));
  },

  /** 특정 계약의 활성 계좌 1건 (계약 상세 탭용). */
  async getByContract(contractId: string): Promise<DepositAccount | null> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_accounts')
      .select('*')
      .eq('contract_id', contractId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    return (data as DepositAccount | null) ?? null;
  },

  /** 단일 계좌의 트랜잭션 전체 (날짜 내림차순, 같은 날짜는 created_at 내림차순). */
  async listTransactions(accountId: string): Promise<DepositTransaction[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('txn_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as DepositTransaction[];
  },

  /** 계약에 예치금 계좌 활성화 (1:1 UNIQUE). */
  async activate(contractId: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_accounts')
      .insert({ contract_id: contractId })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  },

  /**
   * 계좌 비활성화 (soft delete).
   * 호출 전 UI 단에서 활성 트랜잭션 0건 검증 권장 (BIZ-6).
   */
  async deactivate(accountId: string): Promise<void> {
    const supabase = createClient();
    const { error } = await supabase
      .from('deposit_accounts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', accountId);
    if (error) throw error;
  },

  /** 트랜잭션 등록 (INSERT). 트리거가 잔액 자동 갱신. */
  async addTransaction(params: AddTransactionInput): Promise<DepositTransaction> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deposit_transactions')
      .insert({ ...params, source: 'manual' as const })
      .select()
      .single();
    if (error) throw error;
    return data as DepositTransaction;
  },

  /** 트랜잭션 무효화 (immutable 로그 유지). */
  async voidTransaction(txnId: string, reason: string): Promise<void> {
    const supabase = createClient();
    const { data: userResp } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('deposit_transactions')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: userResp.user?.id ?? null,
        void_reason: reason,
      })
      .eq('id', txnId)
      .is('voided_at', null);
    if (error) throw error;
  },
};

import { createClient } from '@/lib/supabase/client';
import {
  calcAlertLevel,
  calcAvgMonthlyUsage,
  calcBalancePct,
  calcDaysUntilDepleted,
} from '@/lib/deposit/calc-balance';
import type {
  AlertLevel,
  DepositAccount,
  DepositTransaction,
  DepositTxnType,
} from '@/lib/deposit/types';

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

export interface DepositAccountMetrics {
  avgMonthlyUsage: number;
  daysUntilDepleted: number;
  balancePct: number;
  alertLevel: AlertLevel;
}

export interface DepositAccountWithMetrics extends DepositAccountWithContract {
  metrics: DepositAccountMetrics;
}

/** 예치금 계좌 활성화 대상 MSP 계약 (미설정 또는 비활성). */
export interface ActivatableContract {
  id: string;
  name: string;
  contract_id: string;
  currency: 'KRW' | 'USD';
  client_name: string | null;
  /** 이전에 비활성(soft delete)된 계좌가 있으면 true → "재활성화" */
  hasDeactivated: boolean;
}

export interface AddTransactionInput {
  account_id: string;
  txn_date: string;
  txn_type: DepositTxnType;
  amount: number;
  memo?: string;
}

export const depositService = {
  /**
   * 활성 계좌 + 계약 정보 + 정밀 메트릭 (alertLevel/avgMonthlyUsage/daysUntilDepleted/balancePct).
   * 모든 화면(카드/KPI/사이드바 배지/정렬)이 같은 alertLevel을 source of truth로 사용.
   * 트랜잭션을 IN 쿼리 1회로 묶어 가져와 클라이언트에서 계좌별 그룹핑 후 메트릭 계산.
   */
  async listAccountsWithMetrics(): Promise<DepositAccountWithMetrics[]> {
    const accounts = await this.listAccounts();
    if (accounts.length === 0) return [];

    const supabase = createClient();
    const accountIds = accounts.map((a) => a.id);
    const { data: txnRows, error } = await supabase
      .from('deposit_transactions')
      .select('*')
      .in('account_id', accountIds);
    if (error) throw error;

    const txnsByAccount = new Map<string, DepositTransaction[]>();
    for (const t of (txnRows ?? []) as DepositTransaction[]) {
      const list = txnsByAccount.get(t.account_id);
      if (list) list.push(t);
      else txnsByAccount.set(t.account_id, [t]);
    }

    return accounts.map((account) => {
      const txns = txnsByAccount.get(account.id) ?? [];
      const avgMonthlyUsage = calcAvgMonthlyUsage(account, txns);
      const daysUntilDepleted = calcDaysUntilDepleted(account.balance, avgMonthlyUsage);
      const balancePct = calcBalancePct(account);
      const alertLevel = calcAlertLevel(account, avgMonthlyUsage);
      return {
        ...account,
        metrics: { avgMonthlyUsage, daysUntilDepleted, balancePct, alertLevel },
      };
    });
  },

  /**
   * 예치금 계좌를 활성화할 수 있는 MSP 계약 목록.
   * = MSP 계약 중 "활성(deleted_at IS NULL) deposit 계좌가 없는" 것.
   *   - 계좌가 아예 없음 → 신규 활성화
   *   - 비활성(deleted) 계좌만 있음 → 재활성화 (hasDeactivated=true)
   * RLS(can_access_contract)로 본인 도메인 계약만 반환됨.
   */
  async listActivatableMspContracts(): Promise<ActivatableContract[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('contracts')
      .select('id, name, contract_id, currency, clients(name), deposit_accounts(id, deleted_at)')
      .eq('type', 'msp')
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;

    type Row = {
      id: string;
      name: string;
      contract_id: string;
      currency: 'KRW' | 'USD';
      clients: { name: string } | null;
      deposit_accounts: { id: string; deleted_at: string | null }[] | null;
    };

    return ((data ?? []) as unknown as Row[])
      .filter((r) => !(r.deposit_accounts ?? []).some((a) => a.deleted_at === null))
      .map((r) => ({
        id: r.id,
        name: r.name,
        contract_id: r.contract_id,
        currency: r.currency,
        client_name: r.clients?.name ?? null,
        hasDeactivated: (r.deposit_accounts ?? []).length > 0,
      }));
  },

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

    type RawRow = Omit<DepositAccount, never> & {
      contract: {
        id: string;
        name: string;
        contract_id: string;
        currency: 'KRW' | 'USD';
        client_id: string;
        clients: { name: string } | null;
      };
    };

    return ((data ?? []) as unknown as RawRow[]).map((row) => ({
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

  /**
   * 트랜잭션 등록 (INSERT). 트리거가 잔액 자동 갱신.
   * `created_by`에 현재 로그인 user.id를 명시 set →
   *   RLS에서 본인 거래 void가 가능해짐 (영업 사용자도 본인 입력분 무효화 OK).
   */
  async addTransaction(params: AddTransactionInput): Promise<DepositTransaction> {
    const supabase = createClient();
    const { data: userResp } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('deposit_transactions')
      .insert({
        ...params,
        source: 'manual' as const,
        created_by: userResp.user?.id ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as DepositTransaction;
  },

  /**
   * 트랜잭션 무효화 (immutable 로그 유지).
   * 동시 void 가드: `.is('voided_at', null)` + select() row 수 검증 →
   *   이미 누가 무효화했으면 두 번째 호출은 throw (silent no-op 방지).
   */
  async voidTransaction(txnId: string, reason: string): Promise<void> {
    const supabase = createClient();
    const { data: userResp } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('deposit_transactions')
      .update({
        voided_at: new Date().toISOString(),
        voided_by: userResp.user?.id ?? null,
        void_reason: reason,
      })
      .eq('id', txnId)
      .is('voided_at', null)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('이미 무효화된 거래입니다.');
    }
  },
};

export type DepositTxnType = 'deposit' | 'usage' | 'adjustment' | 'refund';
export type DepositTxnSource = 'manual' | 'aws_api' | 'billing_on';
export type AlertLevel = 'critical' | 'warning' | 'ok';

export interface DepositTransaction {
  id: string;
  account_id: string;
  txn_date: string;
  txn_type: DepositTxnType;
  amount: number;
  memo: string | null;
  source: DepositTxnSource;
  created_by: string | null;
  created_at: string;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
}

export interface DepositAccount {
  id: string;
  contract_id: string;
  balance: number;
  total_deposit: number;
  total_usage: number;
  last_recalc_at: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

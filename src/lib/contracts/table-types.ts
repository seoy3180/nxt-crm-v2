import type { InlineEditColumnBase } from '@/components/common/inline-edit-table';
import {
  MSP_STAGES,
  EDU_STAGES,
  MSP_GRADES,
  CREDIT_SHARE_OPTIONS,
  PAYER_OPTIONS,
  BILLING_METHOD_OPTIONS,
  AWS_AM_OPTIONS,
} from '@/lib/constants';

// ─── 공용 타입 ────────────────────────────────────────

export interface ContractTableRow {
  id: string;
  name: string;
  type: string;
  clientId: string | null;
  clientName: string | null;
  stage: string | null;
  totalAmount: number;
  assignedTo: string | null;
  assignedToName: string | null;
  contactName: string | null;
  mspDetailId: string | null;
  expectedMrr: number | null;
  creditShare: string | null;
  payer: string | null;
  billingMethod: string | null;
  salesRepId: string | null;
  salesRepName: string | null;
  awsAmount: number | null;
  awsAm: string | null;
  mspGrade: string | null;
  billingOn: boolean;
  billingOnAlias: string | null;
  rootAccountEmail: string | null;
  awsAccountIds: string[];
  techLeadNames: string[];
  tags: string[];
}

export interface ContractColumnDef extends InlineEditColumnBase {
  type: 'text' | 'number' | 'select' | 'dynamic-select' | 'tags';
  options?: readonly string[] | readonly { readonly value: string; readonly label: string }[];
  optionsKey?: string;
  table: 'contracts' | 'msp_details';
  dbColumn?: string;
}

// ─── 컬럼 정의 ────────────────────────────────────────

export const MSP_COLUMNS: ContractColumnDef[] = [
  { key: 'name', label: '계약명', width: 'w-[180px]', editable: false, type: 'text', table: 'contracts', sticky: 'left', stickyOffset: 0 },
  { key: 'clientName', label: '고객', width: 'w-[140px]', editable: false, type: 'text', table: 'contracts', align: 'left' },
  { key: 'stage', label: '단계', width: 'w-[110px]', editable: true, type: 'select', options: MSP_STAGES, table: 'contracts', dbColumn: 'stage' },
  { key: 'totalAmount', label: '금액', width: 'w-[120px]', editable: true, type: 'number', table: 'contracts', dbColumn: 'total_amount' },
  { key: 'expectedMrr', label: '예상 MRR', width: 'w-[120px]', editable: true, type: 'number', table: 'msp_details', dbColumn: 'expected_mrr' },
  { key: 'creditShare', label: '크레딧 쉐어', width: 'w-[110px]', editable: true, type: 'select', options: CREDIT_SHARE_OPTIONS, table: 'msp_details', dbColumn: 'credit_share' },
  { key: 'payer', label: 'Payer', width: 'w-[120px]', editable: true, type: 'select', options: PAYER_OPTIONS, table: 'msp_details', dbColumn: 'payer' },
  { key: 'billingMethod', label: '청구 방식', width: 'w-[140px]', editable: true, type: 'select', options: BILLING_METHOD_OPTIONS, table: 'msp_details', dbColumn: 'billing_method' },
  { key: 'mspGrade', label: 'MSP 등급', width: 'w-[100px]', editable: true, type: 'select', options: MSP_GRADES, table: 'msp_details', dbColumn: 'msp_grade' },
  { key: 'salesRepId', label: '영업 담당', width: 'w-[120px]', editable: true, type: 'dynamic-select', optionsKey: 'salesReps', table: 'msp_details', dbColumn: 'sales_rep_id' },
  { key: 'assignedTo', label: '사내 담당자', width: 'w-[120px]', editable: true, type: 'dynamic-select', optionsKey: 'employees', table: 'contracts', dbColumn: 'assigned_to' },
  { key: 'contactName', label: '고객사 담당자', width: 'w-[120px]', editable: false, type: 'text', table: 'contracts' },
  { key: 'awsAm', label: 'AWS AM', width: 'w-[100px]', editable: true, type: 'select', options: AWS_AM_OPTIONS, table: 'msp_details', dbColumn: 'aws_am' },
  { key: 'awsAmount', label: 'AWS 금액', width: 'w-[120px]', editable: true, type: 'number', table: 'msp_details', dbColumn: 'aws_amount' },
  { key: 'billingOn', label: '빌링온', width: 'w-[80px]', editable: false, type: 'text', table: 'msp_details' },
  { key: 'billingOnAlias', label: '빌링온 별칭', width: 'w-[120px]', editable: true, type: 'text', table: 'msp_details', dbColumn: 'billing_on_alias' },
  { key: 'rootAccountEmail', label: '루트 계정 메일', width: 'w-[200px]', editable: true, type: 'text', table: 'msp_details', dbColumn: 'root_account_email' },
  { key: 'awsAccountIds', label: 'AWS 계정 ID', width: 'w-[160px]', editable: false, type: 'text', table: 'msp_details' },
  { key: 'techLeadNames', label: '담당 기술', width: 'w-[140px]', editable: false, type: 'text', table: 'msp_details' },
  { key: 'tags', label: '태그', width: 'w-[180px]', editable: true, type: 'tags', table: 'msp_details', dbColumn: 'tags' },
];

export const BASIC_COLUMNS: ContractColumnDef[] = [
  { key: 'name', label: '계약명', width: 'w-[180px]', editable: false, type: 'text', table: 'contracts', sticky: 'left', stickyOffset: 0 },
  { key: 'clientName', label: '고객', width: 'w-[140px]', editable: false, type: 'text', table: 'contracts', align: 'left' },
  { key: 'stage', label: '단계', width: 'w-[110px]', editable: true, type: 'select', options: EDU_STAGES, table: 'contracts', dbColumn: 'stage' },
  { key: 'totalAmount', label: '금액', width: 'w-[120px]', editable: true, type: 'number', table: 'contracts', dbColumn: 'total_amount' },
  { key: 'assignedTo', label: '사내 담당자', width: 'w-[120px]', editable: true, type: 'dynamic-select', optionsKey: 'employees', table: 'contracts', dbColumn: 'assigned_to' },
  { key: 'contactName', label: '고객사 담당자', width: 'w-[120px]', editable: false, type: 'text', table: 'contracts' },
];

export const ACTIONS_COLUMN: ContractColumnDef = {
  key: 'actions', label: '', width: 'w-[90px]', editable: false, type: 'text', table: 'contracts', sticky: 'right',
};

export function getColumnsForType(type: string): ContractColumnDef[] {
  return type === 'msp' ? MSP_COLUMNS : BASIC_COLUMNS;
}

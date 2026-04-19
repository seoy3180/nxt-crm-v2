/**
 * 계약 편집 가능 필드의 중앙 정의.
 *
 * 새 필드를 추가하려면 이 배열에만 추가하면 된다:
 * 1. handleSave의 DB 업데이트 매핑
 * 2. 변경이력 fieldLabels
 * 3. 변경이력 diff 로직 (getOriginal, formatDisplay)
 *
 * 를 한 곳에서 관리.
 */

import { safeNumber } from '@/lib/utils';
import type { ContractRow } from '@/lib/services/contract-service';
import type { EmployeeOption } from '@/hooks/use-employees';

/** 필드가 저장될 대상 */
export type FieldTarget = 'contract' | 'msp_details' | 'tech_leads';

/** formatDisplay에서 참조할 수 있는 context */
export interface FieldChangeContext {
  employees?: EmployeeOption[];
  contract: ContractRow;
}

/** 한 필드의 전체 메타데이터 */
export interface ContractFieldDef {
  /** editValues의 키 (UI에서 setField로 세팅하는 이름) */
  key: string;
  /** 변경이력에 표시될 사용자용 라벨 */
  label: string;
  /** 저장될 대상 테이블 */
  target: FieldTarget;
  /** contractService.update/updateMspDetails에 넘길 키 (보통 key와 동일) */
  serviceKey: string;
  /** editValues 문자열 → DB 저장 타입으로 파싱 */
  parse: (raw: string) => unknown;
  /** 변경이력 비교용 — DB의 원본 값을 문자열로 반환 (raw 비교용, null 가능) */
  getOriginal: (contract: ContractRow) => string | null;
  /** 변경이력 표시용 — raw 값을 사람이 보기 좋은 문자열로 포맷. 미정의 시 raw 그대로 */
  formatDisplay?: (raw: string | null, ctx: FieldChangeContext) => string | null;
}

// ────────────────────────────────────────────────────────────
// 헬퍼
// ────────────────────────────────────────────────────────────

const formatCurrency = (v: string | null): string | null =>
  v ? `₩ ${Number(v).toLocaleString()}` : null;

const lookupEmployee = (id: string | null, employees?: EmployeeOption[]): string | null => {
  if (!id) return null;
  return employees?.find((e) => e.id === id)?.name ?? id;
};

// ────────────────────────────────────────────────────────────
// 필드 정의 (16개)
// ────────────────────────────────────────────────────────────

export const CONTRACT_FIELDS: ContractFieldDef[] = [
  // contracts 테이블
  {
    key: 'totalAmount',
    label: '금액',
    target: 'contract',
    serviceKey: 'totalAmount',
    parse: (v) => safeNumber(v) ?? 0,
    getOriginal: (c) => String(c.total_amount),
    formatDisplay: formatCurrency,
  },
  {
    key: 'currency',
    label: '통화',
    target: 'contract',
    serviceKey: 'currency',
    parse: (v) => v || 'KRW',
    getOriginal: (c) => c.currency ?? 'KRW',
  },
  {
    key: 'assignedTo',
    label: '사내 담당자',
    target: 'contract',
    serviceKey: 'assignedTo',
    parse: (v) => v || null,
    getOriginal: (c) => c.assigned_to ?? null,
  },
  {
    key: 'memo',
    label: '메모',
    target: 'contract',
    serviceKey: 'memo',
    parse: (v) => v || null,
    getOriginal: (c) => c.memo ?? null,
  },

  // contract_msp_details 테이블
  {
    key: 'creditShare',
    label: '크레딧 쉐어',
    target: 'msp_details',
    serviceKey: 'creditShare',
    parse: (v) => v || null,
    getOriginal: (c) => c.msp_details?.credit_share ?? null,
  },
  {
    key: 'expectedMrr',
    label: '예상 MRR',
    target: 'msp_details',
    serviceKey: 'expectedMrr',
    parse: (v) => safeNumber(v),
    getOriginal: (c) =>
      c.msp_details?.expected_mrr != null ? String(c.msp_details.expected_mrr) : null,
    formatDisplay: formatCurrency,
  },
  {
    key: 'payer',
    label: 'Payer',
    target: 'msp_details',
    serviceKey: 'payer',
    parse: (v) => v || null,
    getOriginal: (c) => c.msp_details?.payer ?? null,
  },
  {
    key: 'billingMethod',
    label: '청구 방식',
    target: 'msp_details',
    serviceKey: 'billingMethod',
    parse: (v) => v || null,
    getOriginal: (c) => c.msp_details?.billing_method ?? null,
  },
  {
    key: 'salesRepId',
    label: '영업 담당',
    target: 'msp_details',
    serviceKey: 'salesRepId',
    parse: (v) => v || null,
    getOriginal: (c) => c.msp_details?.sales_rep_id ?? null,
    formatDisplay: (v, ctx) => lookupEmployee(v, ctx.employees),
  },
  {
    key: 'awsAmount',
    label: 'AWS 금액',
    target: 'msp_details',
    serviceKey: 'awsAmount',
    parse: (v) => safeNumber(v),
    getOriginal: (c) =>
      c.msp_details?.aws_amount != null ? String(c.msp_details.aws_amount) : null,
    formatDisplay: formatCurrency,
  },
  {
    key: 'awsAm',
    label: 'AWS AM',
    target: 'msp_details',
    serviceKey: 'awsAm',
    parse: (v) => v || null,
    getOriginal: (c) => c.msp_details?.aws_am ?? null,
  },
  {
    key: 'awsAccountIds',
    label: 'AWS 계정 ID',
    target: 'msp_details',
    serviceKey: 'awsAccountIds',
    parse: (v) => v.split(',').map((s) => s.trim()).filter(Boolean),
    getOriginal: (c) => (c.msp_details?.aws_account_ids ?? []).join(', ') || null,
  },
  {
    key: 'mspGrade',
    label: 'MSP 등급',
    target: 'msp_details',
    serviceKey: 'mspGrade',
    parse: (v) => v || null,
    getOriginal: (c) => c.msp_details?.msp_grade ?? null,
  },
  {
    key: 'billingOn',
    label: '빌링온',
    target: 'msp_details',
    serviceKey: 'billingOn',
    parse: (v) => v === 'true',
    getOriginal: (c) => (c.msp_details?.billing_on ? 'true' : 'false'),
    formatDisplay: (v) => (v === 'true' ? '등록' : '미등록'),
  },
  {
    key: 'billingOnAlias',
    label: '빌링온 별칭',
    target: 'msp_details',
    serviceKey: 'billingOnAlias',
    parse: (v) => v || null,
    getOriginal: (c) => c.msp_details?.billing_on_alias ?? null,
  },
  {
    key: 'tags',
    label: '태그',
    target: 'msp_details',
    serviceKey: 'tags',
    parse: (v) => v.split(',').map((s) => s.trim()).filter(Boolean),
    getOriginal: (c) => (c.msp_details?.tags ?? []).join(', ') || null,
  },

  // contract_tech_leads (별도 service 메서드)
  {
    key: 'techLeadIds',
    label: '담당 기술',
    target: 'tech_leads',
    serviceKey: 'techLeadIds',
    parse: (v) => v.split(',').map((s) => s.trim()).filter(Boolean),
    getOriginal: (c) => (c.tech_leads ?? []).map((t) => t.employee_id).join(',') || null,
    formatDisplay: (v, ctx) => {
      if (!v) return null;
      const ids = v.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length === 0) return null;
      return ids.map((id) => lookupEmployee(id, ctx.employees)).join(', ');
    },
  },
];

// 편의 lookup
export const CONTRACT_FIELDS_BY_KEY = new Map(
  CONTRACT_FIELDS.map((f) => [f.key, f]),
);

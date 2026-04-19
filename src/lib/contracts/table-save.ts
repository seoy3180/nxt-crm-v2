import { createClient } from '@/lib/supabase/client';
import { safeNumber, formatAmount } from '@/lib/utils';
import { contractService } from '@/lib/services/contract-service';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import type { ContractTableRow, ContractColumnDef } from './table-types';

type PendingChange = Record<string, unknown>;
type DynamicOptions = Record<string, { value: string; label: string }[]>;

/**
 * 인라인 편집 저장 로직 — DB 업데이트 + 변경이력 기록.
 * MSP 페이지와 전사 페이지에서 공유.
 */
export async function saveInlineChanges(opts: {
  changes: Map<string, PendingChange>;
  columns: ContractColumnDef[];
  contractType: string;
  currentUserId: string | null;
  contracts: ContractTableRow[];
  dynamicOptions: DynamicOptions;
}) {
  const { changes, columns, contractType, currentUserId, contracts, dynamicOptions } = opts;
  const supabase = createClient();

  // 1) DB 저장
  const promises = Array.from(changes.values()).map((change) => {
    const contractUpdate: Record<string, unknown> = {};
    const mspUpdate: Record<string, unknown> = {};
    columns.forEach((col) => {
      if (!col.editable || !col.dbColumn || !(col.key in change)) return;
      const val = change[col.key];
      const dbVal = col.type === 'number' ? (String(val ?? '').trim() === '' ? null : safeNumber(val))
        : col.type === 'tags' ? String(val ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        : val;
      if (col.table === 'contracts') contractUpdate[col.dbColumn] = dbVal;
      else mspUpdate[col.dbColumn] = dbVal;
    });

    const ops: PromiseLike<void>[] = [];
    if (Object.keys(contractUpdate).length > 0) {
      ops.push(
        supabase.from('contracts').update(contractUpdate).eq('id', change.contractId as string)
          .then(({ error }) => { if (error) throw error; }),
      );
    }
    if (Object.keys(mspUpdate).length > 0 && contractType === 'msp') {
      if (change.mspDetailId) {
        ops.push(
          supabase.from('contract_msp_details').update(mspUpdate).eq('contract_id', change.contractId as string)
            .then(({ error }) => { if (error) throw error; }),
        );
      } else {
        ops.push(
          supabase.from('contract_msp_details').insert({ contract_id: change.contractId as string, ...mspUpdate })
            .then(({ error }) => { if (error) throw error; }),
        );
      }
    }
    return Promise.all(ops);
  });
  await Promise.all(promises);

  // 2) 변경이력 기록
  if (currentUserId) {
    const stages = contractType === 'msp' ? MSP_STAGES : EDU_STAGES;
    const historyPromises = Array.from(changes.entries()).map(([contractId, change]) => {
      const original = contracts.find((c: ContractTableRow) => c.id === contractId);
      if (!original) return Promise.resolve();
      const fieldChanges: { field: string; oldValue: string | null; newValue: string | null }[] = [];

      columns.forEach((col) => {
        if (!col.editable || !col.dbColumn || !(col.key in change)) return;
        let oldVal = String(original[col.key as keyof ContractTableRow] ?? '') || null;
        let newVal = String(change[col.key] ?? '') || null;

        if (col.type === 'dynamic-select' && col.optionsKey) {
          const opts = dynamicOptions[col.optionsKey] ?? [];
          if (oldVal) oldVal = opts.find((o) => o.value === oldVal)?.label ?? oldVal;
          if (newVal) newVal = opts.find((o) => o.value === newVal)?.label ?? newVal;
        }
        if (col.key === 'stage') {
          const stageOpts = stages as readonly { readonly value: string; readonly label: string }[];
          if (oldVal) oldVal = stageOpts.find((s) => s.value === oldVal)?.label ?? oldVal;
          if (newVal) newVal = stageOpts.find((s) => s.value === newVal)?.label ?? newVal;
        }
        if (col.type === 'number') {
          if (oldVal) oldVal = formatAmount(Number(oldVal));
          if (newVal) newVal = formatAmount(Number(newVal));
        }
        if (oldVal !== newVal) fieldChanges.push({ field: col.label, oldValue: oldVal, newValue: newVal });
      });

      return contractService.logChanges(contractId, currentUserId, fieldChanges);
    });
    await Promise.all(historyPromises).catch((err) => {
      console.error('[table-save] 변경이력 저장 실패:', err);
    });
  }
}

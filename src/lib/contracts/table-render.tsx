import Link from 'next/link';
import { formatAmount, getStageColor } from '@/lib/utils';
import { MSP_STAGES, EDU_STAGES, MSP_TAG_COLORS } from '@/lib/constants';
import { InlineTagSelect } from '@/components/contracts/inline-tag-select';
import type { ContractTableRow, ContractColumnDef } from './table-types';

type DynamicOptions = Record<string, { value: string; label: string }[]>;

// ─── 유틸 ─────────────────────────────────────────────

export function getSelectOptions(col: ContractColumnDef): { value: string; label: string }[] {
  if (!col.options) return [];
  const opts = col.options as readonly unknown[];
  if (opts.length === 0) return [];
  if (typeof opts[0] === 'string') return (opts as readonly string[]).map((o) => ({ value: o, label: o }));
  return [...(opts as readonly { readonly value: string; readonly label: string }[])];
}

export function resolveDisplayName(value: string, col: ContractColumnDef, dynamicOptions: DynamicOptions): string {
  if (col.type !== 'dynamic-select' || !value) return value;
  const opts = dynamicOptions[col.optionsKey ?? ''] ?? [];
  return opts.find((o) => o.value === value)?.label ?? value;
}

export function getStageBadge(stage: string | null, contractType: string) {
  const stages = contractType === 'msp' ? MSP_STAGES : EDU_STAGES;
  const label = stage ? (stages.find((s) => s.value === stage)?.label ?? stage) : '미지정';
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${getStageColor(stage)}`}>{label}</span>;
}

// ─── 셀 렌더 ──────────────────────────────────────────

export function renderCellValue(
  row: ContractTableRow,
  col: ContractColumnDef,
  displayValue: string,
  opts: { basePath: string; contractType: string; dynamicOptions: DynamicOptions },
) {
  if (col.key === 'name') return row.name;
  if (col.key === 'clientName' && row.clientId) {
    return (
      <Link href={`${opts.basePath}/clients/${row.clientId}`} onClick={(e) => e.stopPropagation()} className="font-medium text-blue-600 hover:underline">
        {row.clientName ?? '-'}
      </Link>
    );
  }
  if (col.key === 'actions') {
    return (
      <Link href={`${opts.basePath}/contracts/${row.id}`} className="rounded-md border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 transition-colors">
        상세보기
      </Link>
    );
  }
  if (col.key === 'stage') return getStageBadge(displayValue || null, opts.contractType);
  if ((col.key === 'creditShare' || col.key === 'mspGrade') && displayValue) {
    return <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">{displayValue}</span>;
  }
  if (col.key === 'billingOn') {
    const on = row.billingOn;
    return (
      <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${on ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
        {on ? '등록' : '미등록'}
      </span>
    );
  }
  if (col.key === 'awsAccountIds') {
    const ids = row.awsAccountIds ?? [];
    if (ids.length === 0) return '-';
    const firstId = ids[0] ?? '';
    const first = firstId.length > 20 ? firstId.slice(0, 20) + '…' : firstId;
    const remaining = ids.length - 1;
    return (
      <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
        <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[10px] text-blue-600 whitespace-nowrap">{first}</span>
        {remaining > 0 && <span className="shrink-0 text-[10px] text-zinc-400">+{remaining}</span>}
      </div>
    );
  }
  if (col.key === 'techLeadNames') {
    const names = row.techLeadNames ?? [];
    if (names.length === 0) return '-';
    const shown = names.slice(0, 2);
    const remaining = names.length - 2;
    return (
      <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
        {shown.map((n) => (
          <span key={n} className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-700 whitespace-nowrap">{n}</span>
        ))}
        {remaining > 0 && <span className="shrink-0 text-[11px] text-zinc-400">+{remaining}</span>}
      </div>
    );
  }
  if (col.type === 'number') {
    if (!displayValue || displayValue === '0') return '-';
    return formatAmount(Number(displayValue));
  }
  if (col.type === 'dynamic-select') return resolveDisplayName(displayValue, col, opts.dynamicOptions) || '-';
  if (col.type === 'tags') {
    const tags = displayValue.split(',').map((s) => s.trim()).filter(Boolean);
    if (tags.length === 0) return '-';
    const shown = tags.slice(0, 2);
    const remaining = tags.length - shown.length;
    return (
      <div className="flex flex-nowrap items-center gap-1 overflow-hidden">
        {shown.map((t) => (
          <span key={t} className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${MSP_TAG_COLORS[t] ?? 'bg-zinc-100 text-zinc-600'}`}>{t}</span>
        ))}
        {remaining > 0 && <span className="shrink-0 text-[11px] text-zinc-400">+{remaining}</span>}
      </div>
    );
  }
  if (col.key === 'contactName') return displayValue || '-';
  return displayValue || '-';
}

// ─── 편집 셀 렌더 ─────────────────────────────────────

export function renderEditingCell(
  row: ContractTableRow,
  col: ContractColumnDef,
  opts: {
    tempValue: string;
    setTempValue: (v: string) => void;
    saveCellEdit: (row: ContractTableRow) => void;
    setEditingCell: (v: null) => void;
    dynamicOptions: DynamicOptions;
  },
) {
  if (col.type === 'select' || col.type === 'dynamic-select') {
    const selectOpts = col.type === 'dynamic-select'
      ? (opts.dynamicOptions[col.optionsKey ?? ''] ?? [])
      : getSelectOptions(col);
    return (
      <select
        autoFocus
        value={opts.tempValue}
        onChange={(e) => opts.setTempValue(e.target.value)}
        onBlur={() => opts.saveCellEdit(row)}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); opts.setEditingCell(null); } }}
        className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-1 text-[13px] text-zinc-900 outline-none"
      >
        <option value="">미지정</option>
        {selectOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (col.type === 'tags') {
    return <InlineTagSelect value={opts.tempValue} onChange={opts.setTempValue} onDone={() => opts.saveCellEdit(row)} />;
  }
  return (
    <input
      autoFocus
      type="text"
      inputMode={col.type === 'number' ? 'numeric' : undefined}
      value={opts.tempValue}
      onChange={(e) => opts.setTempValue(e.target.value)}
      onBlur={() => opts.saveCellEdit(row)}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter') opts.saveCellEdit(row);
        if (e.key === 'Escape') opts.setEditingCell(null);
      }}
      className="h-8 w-full rounded border border-blue-400 bg-blue-50 px-2 text-[13px] text-zinc-900 outline-none"
    />
  );
}

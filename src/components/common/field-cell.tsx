'use client';

import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * FieldCell: 라벨 + 편집/읽기 전환이 필요한 폼 셀의 공통 레이아웃.
 *
 * 내부엔 `FieldText`, `FieldNumber`, `FieldSelect`, `FieldChips` 같은
 * variant를 조합해 사용한다.
 *
 * 예시:
 *   <FieldCell label="MSP 등급">
 *     <FieldSelect editing={editing} value={val} readValue={val} options={MSP_GRADES} onChange={...} />
 *   </FieldCell>
 */
export function FieldCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      {children}
    </div>
  );
}

/** 읽기 전용 일반 텍스트 — "-" fallback */
export function FieldReadText({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const isEmpty =
    children == null || children === '' || (Array.isArray(children) && children.length === 0);
  return (
    <p className={cn('text-[15px] font-medium text-zinc-900', className)}>
      {isEmpty ? '-' : children}
    </p>
  );
}

/** 텍스트 필드: 편집 모드에서 input, 읽기 모드에서 text */
export function FieldText({
  editing,
  value,
  readValue,
  onChange,
  placeholder,
  inputClassName,
}: {
  editing: boolean;
  value: string;
  readValue?: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
  inputClassName?: string;
}) {
  if (editing) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('h-9', inputClassName)}
        placeholder={placeholder}
      />
    );
  }
  return <FieldReadText>{readValue}</FieldReadText>;
}

/** 숫자 필드: 편집 모드에서 numeric input, 읽기 모드에서 format된 값 */
export function FieldNumber({
  editing,
  value,
  readValue,
  format,
  onChange,
}: {
  editing: boolean;
  value: string;
  readValue?: number | null;
  format?: (n: number) => string;
  onChange: (v: string) => void;
}) {
  if (editing) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        className="h-9"
      />
    );
  }
  return (
    <FieldReadText>{readValue != null ? (format ? format(readValue) : String(readValue)) : null}</FieldReadText>
  );
}

/** Select options: 문자열 배열 또는 {value, label} 객체 배열 */
type SelectOption = string | { value: string; label: string };

/** 셀렉트 필드: 편집 모드 Select, 읽기 모드 텍스트 */
export function FieldSelect({
  editing,
  value,
  readValue,
  options,
  onChange,
  placeholder = '선택',
  readClassName,
}: {
  editing: boolean;
  value: string;
  readValue?: string | null;
  options: readonly SelectOption[];
  onChange: (v: string) => void;
  placeholder?: string;
  readClassName?: string;
}) {
  if (editing) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => {
            const v = typeof opt === 'string' ? opt : opt.value;
            const label = typeof opt === 'string' ? opt : opt.label;
            return (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    );
  }
  return <FieldReadText className={readClassName}>{readValue}</FieldReadText>;
}

/**
 * 하이브리드 칩 필드: 칩 모드(기본) + 텍스트 모드(벌크 편집) 전환.
 * 읽기 모드에서 collapseAt 초과 시 접기/펼치기.
 */
export function FieldChips({
  editing,
  value,
  readValues,
  onChange,
  placeholder,
  chipClassName = 'bg-zinc-100 text-zinc-700',
  validate,
  collapseAt = 5,
  textModeThreshold = 4,
}: {
  editing: boolean;
  value: string;
  readValues?: string[] | null;
  onChange: (v: string) => void;
  placeholder?: string;
  chipClassName?: string;
  validate?: (v: string) => string | undefined;
  /** 읽기 모드에서 이 수 초과 시 접기 (기본 5) */
  collapseAt?: number;
  /** 칩이 이 수 이상일 때 "텍스트로 편집" 토글 표시 (기본 4) */
  textModeThreshold?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  if (editing) {
    return (
      <HybridChipInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        chipClassName={chipClassName}
        validate={validate}
        textModeThreshold={textModeThreshold}
      />
    );
  }

  if (!readValues || readValues.length === 0) {
    return <FieldReadText>{null}</FieldReadText>;
  }

  const shouldCollapse = readValues.length > collapseAt;
  const displayValues = shouldCollapse && !expanded ? readValues.slice(0, 3) : readValues;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {displayValues.map((v) => (
          <span
            key={v}
            className={cn('rounded-md px-2 py-0.5 text-[13px] font-medium', chipClassName)}
          >
            {v}
          </span>
        ))}
      </div>
      {shouldCollapse && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-blue-600 hover:underline"
        >
          {expanded ? '접기' : `+${readValues.length - 3}개 더보기`}
        </button>
      )}
    </div>
  );
}

/** 하이브리드 칩 입력: 칩 모드 ↔ 텍스트 모드 전환 */
function HybridChipInput({
  value,
  onChange,
  placeholder,
  chipClassName = 'bg-zinc-100 text-zinc-700',
  validate,
  textModeThreshold,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  chipClassName?: string;
  validate?: (v: string) => string | undefined;
  textModeThreshold: number;
}) {
  const chips = value.split(',').map((s) => s.trim()).filter(Boolean);
  const [mode, setMode] = useState<'chip' | 'text'>('chip');
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [textValue, setTextValue] = useState('');

  // ── 칩 모드 ──
  function addChip(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (chips.includes(trimmed)) { setInputValue(''); setError('이미 추가된 값입니다'); return; }
    if (validate) { const err = validate(trimmed); if (err) { setError(err); return; } }
    setError(null);
    onChange([...chips, trimmed].join(', '));
    setInputValue('');
  }

  function removeChip(index: number) {
    onChange(chips.filter((_, i) => i !== index).join(', '));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addChip(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && chips.length > 0) {
      removeChip(chips.length - 1);
    } else {
      setError(null);
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    if (text.includes(',') || text.includes('\n')) {
      e.preventDefault();
      const items = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
      const valid: string[] = [];
      for (const item of items) {
        if (chips.includes(item) || valid.includes(item)) continue;
        if (validate && validate(item)) continue;
        valid.push(item);
      }
      if (valid.length > 0) onChange([...chips, ...valid].join(', '));
    }
  }

  // ── 모드 전환 ──
  function switchToText() {
    setTextValue(chips.join('\n'));
    setMode('text');
  }

  function switchToChip() {
    const ids = textValue.split('\n').map((s) => s.trim()).filter(Boolean);
    const valid = [...new Set(validate ? ids.filter((id) => !validate(id)) : ids)];
    onChange(valid.join(', '));
    setMode('chip');
  }

  // ── 텍스트 모드 ──
  if (mode === 'text') {
    const lines = textValue.split('\n').filter((s) => s.trim());
    const invalidLines = validate ? lines.filter((l) => validate(l.trim())) : [];
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">한 줄에 하나씩 입력</p>
          <button type="button" onClick={switchToChip} className="text-[11px] text-blue-600 hover:underline">
            칩으로 편집
          </button>
        </div>
        <textarea
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          rows={Math.min(Math.max(lines.length + 2, 4), 15)}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
          placeholder={placeholder}
        />
        <p className="text-[11px] text-zinc-400">
          {lines.length}개 입력
          {invalidLines.length > 0 && <span className="text-red-500"> · {invalidLines.length}개 유효하지 않음</span>}
        </p>
      </div>
    );
  }

  // ── 칩 모드 ──
  return (
    <div className="space-y-1.5">
      <div className="flex justify-end">
        <button type="button" onClick={switchToText} className="text-[11px] text-blue-600 hover:underline">
          텍스트로 편집
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20">
        {chips.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px] font-medium', chipClassName)}
          >
            {chip}
            <button
              type="button"
              onClick={() => removeChip(i)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors"
            >
              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l6 6M9 3l-6 6" />
              </svg>
            </button>
          </span>
        ))}
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => { if (inputValue.trim()) addChip(inputValue); }}
          placeholder={chips.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-zinc-400"
        />
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {chips.length > 0 && (
        <p className="text-[11px] text-zinc-400">{chips.length}개 · Enter로 추가, Backspace로 삭제</p>
      )}
    </div>
  );
}

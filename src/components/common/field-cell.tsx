'use client';

import type { ReactNode } from 'react';
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

/** 쉼표 구분 문자열을 칩으로 표시 / 편집은 일반 Input */
export function FieldChips({
  editing,
  value,
  readValues,
  onChange,
  placeholder,
  chipClassName = 'bg-zinc-100 text-zinc-700',
}: {
  editing: boolean;
  value: string;
  readValues?: string[] | null;
  onChange: (v: string) => void;
  placeholder?: string;
  chipClassName?: string;
}) {
  if (editing) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
        placeholder={placeholder}
      />
    );
  }
  if (!readValues || readValues.length === 0) {
    return <FieldReadText>{null}</FieldReadText>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {readValues.map((v) => (
        <span
          key={v}
          className={cn('rounded-md px-2 py-0.5 text-[13px] font-medium', chipClassName)}
        >
          {v}
        </span>
      ))}
    </div>
  );
}

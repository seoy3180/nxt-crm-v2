'use client';

import * as React from 'react';
import { useLayoutEffect, useRef } from 'react';
import { formatThousands, stripThousands } from '@/lib/utils';

type MoneyOpts = { allowNegative?: boolean };

function countDigits(s: string) {
  return (s.match(/\d/g) ?? []).length;
}

function caretForDigits(formatted: string, digits: number) {
  if (digits <= 0) return formatted.startsWith('-') ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    const ch = formatted[i]!;
    if (ch >= '0' && ch <= '9') {
      seen += 1;
      if (seen === digits) return i + 1;
    }
  }
  return formatted.length;
}

/**
 * 제어 입력용. raw 값(value)과 onValueChange를 받아 쉼표 표시 + 캐럿 위치 보존 props를 반환.
 * shadcn Input, raw input 어디에나 `{...props}`로 펼쳐 사용.
 */
export function useMoneyInput(
  value: string | number | null | undefined,
  onValueChange: (raw: string) => void,
  opts?: MoneyOpts,
) {
  const elRef = useRef<HTMLInputElement | null>(null);
  const caretRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = elRef.current;
    if (el && caretRef.current != null && document.activeElement === el) {
      el.setSelectionRange(caretRef.current, caretRef.current);
    }
    caretRef.current = null;
  });

  return {
    value: formatThousands(value, opts),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      elRef.current = el;
      const caret = el.selectionStart ?? el.value.length;
      const digitsLeft = countDigits(el.value.slice(0, caret));
      const raw = stripThousands(el.value, opts);
      caretRef.current = caretForDigits(formatThousands(raw, opts), digitsLeft);
      onValueChange(raw);
    },
  };
}

/**
 * 비제어 입력용. onChange에서 DOM 값을 즉시 재포맷하고 캐럿 위치를 동기 복원.
 * FormData 폼처럼 value prop이 없는 input에 사용.
 */
export function handleMoneyInputChange(e: React.ChangeEvent<HTMLInputElement>, opts?: MoneyOpts) {
  const el = e.currentTarget;
  const caret = el.selectionStart ?? el.value.length;
  const digitsLeft = countDigits(el.value.slice(0, caret));
  el.value = formatThousands(el.value, opts);
  const pos = caretForDigits(el.value, digitsLeft);
  el.setSelectionRange(pos, pos);
}

interface MoneyInputProps extends Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> {
  value: string | number | null | undefined;
  onValueChange: (raw: string) => void;
  allowNegative?: boolean;
}

/** 제어 input 컴포넌트. 훅을 쓸 수 없는 렌더 헬퍼(예: 테이블 셀 렌더)에서 사용. */
export function MoneyInput({ value, onValueChange, allowNegative, ...rest }: MoneyInputProps) {
  const money = useMoneyInput(value, onValueChange, { allowNegative });
  return <input {...rest} {...money} />;
}

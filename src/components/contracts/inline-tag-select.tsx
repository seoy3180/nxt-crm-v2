'use client';

import { useRef, useEffect } from 'react';
import { MSP_TAG_OPTIONS, MSP_TAG_COLORS } from '@/lib/constants';

interface InlineTagSelectProps {
  value: string;
  onChange: (v: string) => void;
  onDone: () => void;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
  const savedHandler = useRef(handler);
  useEffect(() => { savedHandler.current = handler; });
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      savedHandler.current();
    }
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref]);
}

export function InlineTagSelect({ value, onChange, onDone }: InlineTagSelectProps) {
  const ref = useRef<HTMLDivElement>(null);
  const selected = value.split(',').map((s) => s.trim()).filter(Boolean);

  function toggle(tag: string) {
    const next = selected.includes(tag)
      ? selected.filter((t) => t !== tag)
      : [...selected, tag];
    onChange(next.join(', '));
  }

  useClickOutside(ref, onDone);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onDone(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDone]);

  return (
    <div ref={ref} className="relative" role="combobox" aria-expanded={true} aria-haspopup="listbox" aria-label="태그 선택">
      <div className="flex w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 h-8 overflow-hidden">
        <span className="flex gap-1 flex-nowrap overflow-hidden">
          {selected.length === 0
            ? <span className="text-[12px] text-zinc-400 whitespace-nowrap">태그 선택</span>
            : (<>
                {selected.slice(0, 2).map((t) => (
                  <span key={t} className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap ${MSP_TAG_COLORS[t] ?? 'bg-zinc-100 text-zinc-600'}`}>{t}</span>
                ))}
                {selected.length > 2 && <span className="shrink-0 text-[10px] text-zinc-400 whitespace-nowrap">+{selected.length - 2}</span>}
              </>)
          }
        </span>
      </div>
      <div className="absolute z-20 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg" role="listbox" aria-label="MSP 태그 목록" aria-multiselectable="true">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-100">
          <span className="text-[11px] text-zinc-400">
            {selected.length > 0 ? `${selected.length}개 선택` : '선택 없음'}
          </span>
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange('')} className="text-[11px] text-red-500 hover:underline">
              초기화
            </button>
          )}
        </div>
        <div className="py-1">
          {MSP_TAG_OPTIONS.map((tag) => {
            const active = selected.includes(tag);
            return (
              <button key={tag} type="button" role="option" aria-selected={active} onClick={() => toggle(tag)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-[12px] transition-colors ${active ? 'bg-blue-50' : 'hover:bg-zinc-50'}`}
              >
                <div className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${active ? 'border-blue-600 bg-blue-600' : 'border-zinc-300'}`}>
                  {active && (
                    <svg className="h-2.5 w-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2.5 6l2.5 2.5 4.5-4.5" />
                    </svg>
                  )}
                </div>
                <span className={`font-medium ${active ? 'text-blue-600' : 'text-zinc-600'}`}>{tag}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

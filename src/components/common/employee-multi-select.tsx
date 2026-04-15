'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/hooks/use-employees';

interface EmployeeMultiSelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

/** 직원 다중 선택 — Popover + Command 체크박스 스타일. 선택된 항목은 하단에 칩으로 표시. */
export function EmployeeMultiSelect({
  selectedIds,
  onChange,
  placeholder = '선택',
  className,
  triggerClassName,
}: EmployeeMultiSelectProps) {
  const { data: employees } = useEmployees();
  const [open, setOpen] = useState(false);

  const selected = (employees ?? []).filter((e) => selectedIds.includes(e.id));

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm transition-colors hover:bg-zinc-50',
            triggerClassName,
          )}
        >
          <span className={selected.length > 0 ? 'text-zinc-900' : 'text-zinc-400'}>
            {selected.length > 0 ? `${selected.length}명 선택됨` : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
        </PopoverTrigger>
        <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="이름 검색..." />
            <CommandList>
              <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
              <CommandGroup>
                {employees?.map((e) => {
                  const isSelected = selectedIds.includes(e.id);
                  return (
                    <CommandItem
                      key={e.id}
                      value={e.name}
                      onSelect={() => toggle(e.id)}
                    >
                      <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                      {e.name}
                      {e.position && <span className="ml-2 text-xs text-zinc-400">{e.position}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
            >
              {e.name}
              <button
                type="button"
                onClick={() => remove(e.id)}
                className="text-zinc-400 hover:text-zinc-700"
                aria-label={`${e.name} 제거`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

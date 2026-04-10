'use client';

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnSettingsProps {
  allColumns: ColumnOption[];
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 고정 컬럼 (항상 표시, 체크박스 비활성) */
  fixedColumns?: string[];
}

function SortableItem({
  col,
  checked,
  disabled,
  onToggle,
}: {
  col: ColumnOption;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.key });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded px-2 py-1.5 text-[13px] hover:bg-zinc-50"
    >
      <GripVertical
        className="h-3 w-3 shrink-0 cursor-grab text-zinc-300 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      />
      <label className="flex flex-1 items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          disabled={disabled}
          className="rounded"
        />
        <span className={disabled ? 'text-zinc-400' : 'text-zinc-700'}>{col.label}</span>
      </label>
    </div>
  );
}

export function ColumnSettings({
  allColumns,
  visibleColumns,
  onColumnsChange,
  open,
  onOpenChange,
  fixedColumns = [],
}: ColumnSettingsProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 3 } }));

  // visibleColumns 순서 + 숨겨진 컬럼 순서를 합쳐서 전체 정렬 순서 유지
  const orderedKeys = [
    ...visibleColumns,
    ...allColumns.filter((c) => !visibleColumns.includes(c.key)).map((c) => c.key),
  ];
  const colMap = new Map(allColumns.map((c) => [c.key, c]));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedKeys.indexOf(String(active.id));
    const newIndex = orderedKeys.indexOf(String(over.id));
    const reordered = arrayMove(orderedKeys, oldIndex, newIndex);

    // visibleColumns만 새 순서로 필터
    const newVisible = reordered.filter((k) => visibleColumns.includes(k));
    onColumnsChange(newVisible);
  }

  function handleToggle(key: string) {
    if (visibleColumns.includes(key)) {
      onColumnsChange(visibleColumns.filter((k) => k !== key));
    } else {
      // 추가할 때: orderedKeys 기준으로 삽입 위치 결정
      const newVisible = orderedKeys.filter((k) => visibleColumns.includes(k) || k === key);
      onColumnsChange(newVisible);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors',
          open
            ? 'bg-blue-50 text-blue-600 border border-blue-600'
            : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50',
        )}
      >
        <Columns3 className="h-3.5 w-3.5" />
        컬럼 설정
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-10 w-52 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedKeys} strategy={verticalListSortingStrategy}>
              {orderedKeys.map((key) => {
                const col = colMap.get(key);
                if (!col) return null;
                return (
                  <SortableItem
                    key={key}
                    col={col}
                    checked={visibleColumns.includes(key)}
                    disabled={fixedColumns.includes(key)}
                    onToggle={() => handleToggle(key)}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { useInlineEdit } from '@/hooks/use-inline-edit';

/** 최소한의 컬럼 정의 — 구체 페이지에선 이를 확장해서 사용 */
export interface InlineEditColumnBase {
  key: string;
  label: string;
  width?: string;
  editable: boolean;
  /** sticky 고정 */
  sticky?: 'left' | 'right';
  /** sticky left 오프셋 (px) */
  stickyOffset?: number;
  /** 텍스트 정렬 */
  align?: 'left' | 'center';
}

interface InlineEditTableProps<T, C extends InlineEditColumnBase> {
  data: T[];
  columns: C[];
  /** useInlineEdit 훅의 반환값 */
  inlineEdit: ReturnType<typeof useInlineEdit<T>>;
  /** 행 ID 추출 함수 (useInlineEdit에 이미 넘긴 것과 동일) */
  getId: (row: T) => string;
  /** 데이터가 없을 때 표시할 텍스트 */
  emptyText?: string;
  /** 로딩 중 여부 (스켈레톤 표시) */
  isLoading?: boolean;
  /** 스켈레톤 행 수 (기본 3) */
  skeletonRows?: number;
  /** 행 클릭 시 이동할 URL 생성. 편집 모드에선 비활성화됨. */
  rowHref?: (row: T) => string;
  /**
   * 일반(비편집) 셀 내용 렌더.
   * col.key === 'name'은 자동으로 왼쪽 정렬 + 진한 텍스트.
   */
  renderCell: (row: T, col: C, displayValue: string) => ReactNode;
  /** 편집 중 셀 렌더 (input / select 등) */
  renderEditingCell: (row: T, col: C) => ReactNode;
  /**
   * 셀을 편집 시작할 때 input/select의 초기값.
   * 기본: `displayValue === '-' ? '' : displayValue`
   */
  getEditInitialValue?: (row: T, col: C, displayValue: string) => string;
}

/**
 * 인라인 편집 기능이 있는 공통 테이블.
 *
 * - edit/read 모드 전환 스타일
 * - 비어있음 / 로딩 / 데이터 행 렌더
 * - 행 클릭으로 상세 페이지 이동 (편집 모드에선 비활성)
 * - 셀 편집 클릭/편집/저장 플로우
 *
 * 셀 렌더링은 `renderCell` / `renderEditingCell`로 호출자에게 위임하여
 * 도메인별 특수 표현(배지, 칩 등)을 자유롭게 처리할 수 있게 했음.
 */
export function InlineEditTable<T, C extends InlineEditColumnBase>({
  data,
  columns,
  inlineEdit,
  getId,
  emptyText = '데이터가 없습니다',
  isLoading = false,
  skeletonRows = 3,
  rowHref,
  renderCell,
  renderEditingCell,
  getEditInitialValue,
}: InlineEditTableProps<T, C>) {
  const router = useRouter();
  const {
    editMode,
    editingCell,
    startCellEdit,
    pendingChanges,
    getDisplayValue,
  } = inlineEdit;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border',
        editMode ? 'border-blue-600' : 'border-zinc-200',
      )}
    >
      <Table>
        <TableHeader>
          <TableRow className={editMode ? 'bg-blue-50' : 'bg-zinc-50'}>
            {columns.map((col) => (
              <TableHead
                key={col.key}
                style={{
                  ...(col.sticky === 'left' ? { position: 'sticky', left: col.stickyOffset ?? 0, zIndex: 2 } : {}),
                  ...(col.sticky === 'right' ? { position: 'sticky', right: 0, zIndex: 2 } : {}),
                }}
                className={cn(
                  'h-10 px-4 text-xs font-semibold',
                  col.width,
                  (col.key === 'name' || col.sticky === 'left' || col.align === 'left') ? 'text-left' : 'text-center',
                  editMode ? 'text-blue-600' : 'text-zinc-500',
                  col.sticky && (editMode ? 'bg-blue-50' : 'bg-zinc-50'),
                  col.sticky === 'left' && 'relative sticky-left-divider',
                  col.sticky === 'right' && 'relative sticky-right-divider',
                )}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-zinc-400">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const rowId = getId(row);
              const hrefTarget = rowHref?.(row);
              return (
                <TableRow
                  key={rowId}
                  tabIndex={!editMode && !!hrefTarget ? 0 : undefined}
                  className={cn(
                    'h-11 border-b border-zinc-100',
                    !editMode && hrefTarget && 'cursor-pointer hover:bg-zinc-50',
                  )}
                  onClick={
                    editMode || !hrefTarget
                      ? undefined
                      : () => router.push(hrefTarget)
                  }
                  onKeyDown={
                    editMode || !hrefTarget
                      ? undefined
                      : (e) => {
                          if (e.key === 'Enter') router.push(hrefTarget);
                        }
                  }
                >
                  {columns.map((col) => {
                    const displayValue = getDisplayValue(row, col.key);
                    const canEdit = editMode && col.editable;
                    const isEditing =
                      editingCell?.rowId === rowId && editingCell?.colKey === col.key;
                    const isChanged =
                      pendingChanges.has(rowId) &&
                      col.key in (pendingChanges.get(rowId) ?? {});

                    const stickyStyle: React.CSSProperties | undefined = col.sticky === 'left'
                      ? { position: 'sticky', left: col.stickyOffset ?? 0, zIndex: 2 }
                      : col.sticky === 'right'
                      ? { position: 'sticky', right: 0, zIndex: 2 }
                      : undefined;
                    const stickyBg = col.sticky
                      ? cn('bg-white relative', col.sticky === 'left' && 'sticky-left-divider', col.sticky === 'right' && 'sticky-right-divider')
                      : '';

                    // 현재 편집 중인 셀
                    if (isEditing) {
                      return (
                        <TableCell key={col.key} style={stickyStyle} className={cn('px-2', col.width, stickyBg)}>
                          {renderEditingCell(row, col)}
                        </TableCell>
                      );
                    }

                    // 편집 가능 + 편집 모드 → 클릭 대기 박스
                    if (canEdit) {
                      const initial = getEditInitialValue
                        ? getEditInitialValue(row, col, displayValue)
                        : displayValue === '-'
                          ? ''
                          : displayValue;
                      return (
                        <TableCell
                          key={col.key}
                          style={stickyStyle}
                          className={cn('px-2', col.width, stickyBg)}
                          onClick={(e) => {
                            e.stopPropagation();
                            startCellEdit(rowId, col.key, initial);
                          }}
                        >
                          <span
                            className={cn(
                              'block cursor-text rounded border px-3 py-1 text-[13px]',
                              col.sticky === 'left' ? 'text-left truncate' : 'text-center',
                              isChanged
                                ? 'border-blue-400 bg-blue-100/50 text-zinc-900'
                                : 'border-blue-200 bg-[#FAFCFF] text-zinc-500',
                            )}
                          >
                            {renderCell(row, col, displayValue)}
                          </span>
                        </TableCell>
                      );
                    }

                    // 일반 셀
                    return (
                      <TableCell
                        key={col.key}
                        style={stickyStyle}
                        className={cn(
                          'px-4',
                          col.width,
                          (col.key === 'name' || col.sticky === 'left' || col.align === 'left')
                            ? 'text-sm font-medium text-zinc-900'
                            : 'text-center text-[13px] text-zinc-500',
                          stickyBg,
                        )}
                      >
                        {renderCell(row, col, displayValue)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

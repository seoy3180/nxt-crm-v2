'use client';

import { cn } from '@/lib/utils';
import type { useInlineEdit } from '@/hooks/use-inline-edit';

type InlineEditState = ReturnType<typeof useInlineEdit<unknown>>;

/**
 * 편집 모드 토글 버튼 — ON/OFF 스위치 스타일.
 * 변경사항이 있는 상태에서 끄려 하면 confirm.
 */
export function InlineEditToggle({
  inlineEdit,
}: {
  inlineEdit: Pick<
    InlineEditState,
    'editMode' | 'setEditMode' | 'changeCount' | 'handleCancelEdit'
  >;
}) {
  const { editMode, setEditMode, changeCount, handleCancelEdit } = inlineEdit;

  return (
    <button
      type="button"
      onClick={() => {
        if (!editMode) {
          setEditMode(true);
        } else if (changeCount > 0) {
          if (confirm('저장하지 않은 변경사항이 있습니다. 취소하시겠습니까?')) {
            handleCancelEdit();
          }
        } else {
          setEditMode(false);
        }
      }}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors',
        editMode
          ? 'bg-blue-50 text-blue-600 border border-blue-600'
          : 'border border-zinc-200 text-zinc-500 hover:bg-zinc-50',
      )}
    >
      편집 모드
      <div
        className={cn(
          'flex h-[18px] w-8 items-center rounded-full px-0.5 transition-colors',
          editMode ? 'bg-blue-600 justify-end' : 'bg-zinc-300 justify-start',
        )}
      >
        <div className="h-3.5 w-3.5 rounded-full bg-white" />
      </div>
    </button>
  );
}

/**
 * 편집 모드 액션 (변경 카운트 + 취소 + 저장).
 * editMode가 false면 아무것도 렌더하지 않음.
 */
export function InlineEditActions({
  inlineEdit,
}: {
  inlineEdit: Pick<
    InlineEditState,
    'editMode' | 'changeCount' | 'saving' | 'handleSave' | 'handleCancelEdit'
  >;
}) {
  const { editMode, changeCount, saving, handleSave, handleCancelEdit } = inlineEdit;
  if (!editMode) return null;

  return (
    <>
      {changeCount > 0 && <span className="text-xs text-blue-600">{changeCount}건 변경</span>}
      <button
        type="button"
        onClick={handleCancelEdit}
        className="flex h-8 items-center rounded-md border border-zinc-200 px-3 text-[13px] text-zinc-500 hover:bg-zinc-50"
      >
        취소
      </button>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex h-8 items-center rounded-md bg-blue-600 px-3 text-[13px] font-semibold text-white hover:bg-blue-700"
      >
        {saving ? '저장 중...' : changeCount > 0 ? `저장 (${changeCount}건)` : '편집 완료'}
      </button>
    </>
  );
}

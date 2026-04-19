'use client';

import { useState, useCallback, useEffect } from 'react';
import { useEditMode } from '@/providers/edit-mode-provider';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

type PendingChange = Record<string, unknown>;

interface UseInlineEditOptions<T> {
  /** 변경 저장 콜백. changes Map의 key는 행 ID. */
  onSave: (changes: Map<string, PendingChange>) => Promise<void>;
  /** 행 데이터에서 특정 필드의 원본 값을 가져오는 함수 */
  getOriginalValue: (item: T, key: string) => string;
  /** 행 ID를 가져오는 함수 */
  getId: (item: T) => string;
  /** 새 pendingChange 생성 시 기본 데이터를 넣는 함수 */
  getChangeDefaults: (item: T) => PendingChange;
}

export function useInlineEdit<T>({ onSave, getOriginalValue, getId, getChangeDefaults }: UseInlineEditOptions<T>) {
  const { setIsEditing } = useEditMode();
  const [editMode, setEditModeLocal] = useState(false);
  const setEditMode = useCallback((v: boolean) => {
    setEditModeLocal(v);
    setIsEditing(v);
    if (!v) setEditingCell(null);
  }, [setIsEditing]);

  const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);
  const [tempValue, setTempValue] = useState('');

  // 언마운트 시 편집 모드 해제
  useEffect(() => {
    return () => setIsEditing(false);
  }, [setIsEditing]);

  // 미저장 데이터 페이지 이탈 경고
  useEffect(() => {
    if (editMode && pendingChanges.size > 0) {
      const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
      window.addEventListener('beforeunload', handler);
      return () => window.removeEventListener('beforeunload', handler);
    }
  }, [editMode, pendingChanges.size]);

  function startCellEdit(rowId: string, colKey: string, value: string) {
    setEditingCell({ rowId, colKey });
    setTempValue(value);
  }

  function saveCellEdit(item: T) {
    if (!editingCell) return;
    const id = getId(item);
    const originalValue = getOriginalValue(item, editingCell.colKey);
    const pending = pendingChanges.get(id);
    const currentOriginal = pending && editingCell.colKey in pending
      ? String(pending[editingCell.colKey] ?? '')
      : originalValue;

    if (tempValue !== currentOriginal) {
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const existing = next.get(id) ?? getChangeDefaults(item);
        next.set(id, { ...existing, [editingCell.colKey]: tempValue || null });
        return next;
      });
    }
    setEditingCell(null);
  }

  function getDisplayValue(item: T, key: string): string {
    const id = getId(item);
    const change = pendingChanges.get(id);
    if (change && key in change) {
      return String(change[key] ?? '');
    }
    return getOriginalValue(item, key);
  }

  async function handleSave() {
    if (pendingChanges.size === 0) {
      setEditMode(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(pendingChanges);
      toast.success(`${pendingChanges.size}건 저장되었습니다`);
      setPendingChanges(new Map());
      setEditingCell(null);
      setSaving(false);
      setEditMode(false);
    } catch (err) {
      toast.error(`저장 실패: ${getErrorMessage(err)}`);
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setPendingChanges(new Map());
    setEditingCell(null);
    setEditMode(false);
  }

  return {
    editMode,
    setEditMode,
    pendingChanges,
    changeCount: pendingChanges.size,
    saving,
    editingCell,
    tempValue,
    setTempValue,
    startCellEdit,
    saveCellEdit,
    getDisplayValue,
    handleSave,
    handleCancelEdit,
    setEditingCell,
  };
}

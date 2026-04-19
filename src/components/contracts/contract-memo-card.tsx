'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { contractService } from '@/lib/services/contract-service';
import { getErrorMessage } from '@/lib/utils';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface ContractMemoCardProps {
  contractId: string;
  memo: string | null;
}

export function ContractMemoCard({ contractId, memo }: ContractMemoCardProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(memo ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function startEdit() {
    setDraft(memo ?? '');
    setEditing(true);
  }

  function handleCancel() {
    setDraft(memo ?? '');
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await contractService.update(contractId, { memo: draft || null } as Parameters<typeof contractService.update>[1]);
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      toast.success('메모가 저장되었습니다');
      setEditing(false);
    } catch (err) {
      toast.error(`저장 실패: ${getErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 256) + 'px';
    }
  }, [editing]);

  return (
    <div className="rounded-xl border border-zinc-200 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">메모</h3>
        {editing ? (
          <div className="flex gap-1.5">
            <button type="button" onClick={handleCancel} className="h-[30px] rounded-md border border-zinc-200 px-3 text-[12px] text-zinc-500 hover:bg-zinc-50">취소</button>
            <button type="button" onClick={handleSave} disabled={saving} className="h-[30px] rounded-md bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        ) : (
          <button type="button" onClick={startEdit} className="flex h-[30px] items-center gap-1 rounded-md border border-zinc-200 px-2.5 text-[12px] text-zinc-400 hover:bg-zinc-50">
            <Pencil className="h-3 w-3" /> 수정
          </button>
        )}
      </div>
      <div className="mt-3">
        {editing ? (
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 256) + 'px';
            }}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400 resize-none max-h-64 overflow-y-auto"
            placeholder="메모를 입력하세요"
          />
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {memo ? (
              <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">{memo}</p>
            ) : (
              <p className="text-sm text-zinc-400">메모가 없습니다</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

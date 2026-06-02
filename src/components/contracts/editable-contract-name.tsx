'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { contractService } from '@/lib/services/contract-service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getErrorMessage } from '@/lib/utils';

/**
 * 계약 상세 헤더의 계약명(h1) 인라인 편집.
 * 백엔드(contractService.update·RLS·validator)는 name 수정을 이미 지원하므로
 * 여기서는 편집 UI + 저장 + 변경이력 로깅만 담당한다.
 * 권한 게이팅 없음 — 실제 차단은 contracts UPDATE RLS(can_access_contract)가 수행.
 */
export function EditableContractName({
  contractId,
  name,
}: {
  contractId: string;
  name: string;
}) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(name);

  function startEdit() {
    setDraft(name);
    setEditing(true);
  }

  async function handleSave() {
    const newName = draft.trim();
    if (!newName) {
      toast.error('계약명을 입력해주세요');
      return;
    }
    if (newName === name) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await contractService.update(contractId, { name: newName });
      // 변경이력 — 저장 실패가 본 저장을 막지 않도록 삼킴(contract-info-card와 동일 패턴)
      if (currentUser) {
        await contractService
          .logChanges(contractId, currentUser.id, [
            { field: '계약명', oldValue: name, newValue: newName },
          ])
          .catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract-history', contractId] });
      // 목록 뷰(테이블/스테이지/EduTT)도 갱신 — 뒤로가기 시 stale 캐시 방지
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['msp-contracts-table'] });
      toast.success('계약명이 저장되었습니다');
      setEditing(false);
    } catch (err) {
      toast.error(`저장 실패: ${getErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900">{name}</h1>
        <button
          type="button"
          onClick={startEdit}
          title="계약명 수정"
          className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-300 transition-colors hover:bg-zinc-50 hover:text-zinc-500"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') setEditing(false);
        }}
        maxLength={200}
        autoFocus
        className="h-9 w-[320px] rounded-md border border-blue-300 px-2 text-2xl font-semibold text-zinc-900 outline-none"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="h-[30px] shrink-0 rounded-md bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className="h-[30px] shrink-0 rounded-md border border-zinc-200 px-3 text-[12px] text-zinc-500 hover:bg-zinc-50"
      >
        취소
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Plus, X } from 'lucide-react';
import { MSP_GRADES, INDUSTRY_OPTIONS, COMPANY_SIZE_OPTIONS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

interface MspDetail {
  id: string;
  msp_grade: string | null;
  industry: string | null;
  company_size: string | null;
  aws_am: string | null;
  aws_account_ids: string[] | null;
  tags: string[] | null;
  memo: string | null;
}

interface MspInfoTabProps {
  clientId: string;
}

export function MspInfoTab({ clientId }: MspInfoTabProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});
  const [newAwsId, setNewAwsId] = useState('');
  const [newTag, setNewTag] = useState('');

  const { data: detail, isLoading } = useQuery({
    queryKey: ['client-msp-detail', clientId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('client_msp_details')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();
      if (error) throw error;
      return data as MspDetail | null;
    },
  });

  // MSP 계약 요약
  const { data: contractSummary } = useQuery({
    queryKey: ['client-msp-contracts', clientId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contracts')
        .select('id, total_amount, stage')
        .eq('client_id', clientId)
        .eq('type', 'msp')
        .is('deleted_at', null);
      if (error) throw error;
      const contracts = data ?? [];
      return {
        total: contracts.length,
        totalAmount: contracts.reduce((sum, c) => sum + (c.total_amount ?? 0), 0),
        active: contracts.filter((c) => c.stage && c.stage !== 'settled').length,
        settled: contracts.filter((c) => c.stage === 'settled').length,
      };
    },
  });

  function val(field: string) {
    if (field in editValues) return editValues[field];
    if (!detail) return null;
    return detail[field as keyof MspDetail];
  }

  function setField(field: string, value: unknown) {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  }

  // AWS 계정 ID 관리 (편집 모드)
  function getAwsIds(): string[] {
    return (val('aws_account_ids') as string[] | null) ?? [];
  }

  function addAwsId() {
    const id = newAwsId.trim();
    if (!id) return;
    const current = getAwsIds();
    if (current.includes(id)) { toast.error('이미 등록된 계정입니다'); return; }
    setField('aws_account_ids', [...current, id]);
    setNewAwsId('');
  }

  function removeAwsId(id: string) {
    setField('aws_account_ids', getAwsIds().filter((a) => a !== id));
  }

  // 태그 관리 (편집 모드)
  function getTags(): string[] {
    return (val('tags') as string[] | null) ?? [];
  }

  function addTag() {
    const tag = newTag.trim();
    if (!tag) return;
    const current = getTags();
    if (current.includes(tag)) { toast.error('이미 등록된 태그입니다'); return; }
    setField('tags', [...current, tag]);
    setNewTag('');
  }

  function removeTag(tag: string) {
    setField('tags', getTags().filter((t) => t !== tag));
  }

  function handleCancel() {
    setEditValues({});
    setEditing(false);
    setNewAwsId('');
    setNewTag('');
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    try {
      const updateData: Record<string, unknown> = {};
      if ('msp_grade' in editValues) updateData.msp_grade = editValues.msp_grade || null;
      if ('industry' in editValues) updateData.industry = editValues.industry || null;
      if ('company_size' in editValues) updateData.company_size = editValues.company_size || null;
      if ('aws_am' in editValues) updateData.aws_am = editValues.aws_am || null;
      if ('aws_account_ids' in editValues) updateData.aws_account_ids = editValues.aws_account_ids ?? [];
      if ('tags' in editValues) updateData.tags = editValues.tags ?? [];
      if ('memo' in editValues) updateData.memo = editValues.memo || null;

      if (Object.keys(updateData).length === 0) {
        setEditing(false);
        return;
      }

      if (detail) {
        const { error } = await supabase
          .from('client_msp_details')
          .update(updateData)
          .eq('id', detail.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_msp_details')
          .insert({ client_id: clientId, ...updateData });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['client-msp-detail', clientId] });
      toast.success('MSP 정보가 저장되었습니다');
      setEditValues({});
      setEditing(false);
      setNewAwsId('');
      setNewTag('');
    } catch (err) {
      toast.error(`저장 실패: ${getErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  function formatAmount(amount: number) {
    if (amount >= 100000000) return `₩ ${(amount / 100000000).toFixed(1)}억`;
    if (amount >= 10000) return `₩ ${Math.round(amount / 10000).toLocaleString()}만`;
    return `₩ ${amount.toLocaleString()}`;
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  const awsIds = getAwsIds();
  const tags = getTags();

  return (
    <div className="space-y-6">
      {/* MSP 계약 요약 */}
      <div className="rounded-xl border border-zinc-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-zinc-900">MSP 계약 요약</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-lg bg-zinc-50 p-4 space-y-1">
            <p className="text-xs font-medium text-zinc-400">총 계약</p>
            <p className="text-xl font-bold text-zinc-900">{contractSummary?.total ?? 0}건</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4 space-y-1">
            <p className="text-xs font-medium text-zinc-400">총 금액</p>
            <p className="text-xl font-bold text-zinc-900">{formatAmount(contractSummary?.totalAmount ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4 space-y-1">
            <p className="text-xs font-medium text-zinc-400">활성 계약</p>
            <p className="text-xl font-bold text-blue-600">{contractSummary?.active ?? 0}건</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4 space-y-1">
            <p className="text-xs font-medium text-zinc-400">정산 완료</p>
            <p className="text-xl font-bold text-green-600">{contractSummary?.settled ?? 0}건</p>
          </div>
        </div>
        <p className="text-xs text-zinc-400">상세 계약 정보는 &apos;관련 계약&apos; 탭 또는 계약 상세 페이지에서 확인하세요.</p>
      </div>

      {/* MSP 정보 카드 */}
      <div className="rounded-xl border border-zinc-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">MSP 정보</h3>
          {editing ? (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={handleCancel}
                className="h-[30px] rounded-md border border-zinc-200 px-3 text-[12px] text-zinc-500 hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-[30px] rounded-md bg-blue-600 px-3 text-[12px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex h-[30px] items-center gap-1 rounded-md border border-zinc-200 px-2.5 text-[12px] text-zinc-400 hover:bg-zinc-50"
            >
              <Pencil className="h-3 w-3" />
              수정
            </button>
          )}
        </div>

        {/* MSP 등급 + AWS AM */}
        <div className="grid grid-cols-3 gap-8">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400">MSP 등급</p>
            {editing ? (
              <Select value={(val('msp_grade') as string) ?? ''} onValueChange={(v) => setField('msp_grade', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {MSP_GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[15px] font-semibold text-blue-600">{detail?.msp_grade ?? '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400">AWS AM</p>
            {editing ? (
              <Input
                value={(val('aws_am') as string) ?? ''}
                onChange={(e) => setField('aws_am', e.target.value)}
                className="h-9"
                placeholder="AWS 담당자명"
              />
            ) : (
              <p className="text-[15px] font-medium text-zinc-900">{detail?.aws_am ?? '-'}</p>
            )}
          </div>
          <div />
        </div>

        <div className="h-px bg-zinc-100" />

        {/* 산업 분야 + 기업 규모 */}
        <div className="grid grid-cols-3 gap-8">
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400">산업 분야</p>
            {editing ? (
              <Select value={(val('industry') as string) ?? ''} onValueChange={(v) => setField('industry', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[15px] font-medium text-zinc-900">{detail?.industry ?? '-'}</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400">기업 규모</p>
            {editing ? (
              <Select value={(val('company_size') as string) ?? ''} onValueChange={(v) => setField('company_size', v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="선택" /></SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-[15px] font-medium text-zinc-900">{detail?.company_size ?? '-'}</p>
            )}
          </div>
          <div />
        </div>

        <div className="h-px bg-zinc-100" />

        {/* AWS 계정 ID */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">AWS 계정 ID</p>
            {editing && (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newAwsId}
                  onChange={(e) => setNewAwsId(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addAwsId(); } }}
                  placeholder="계정 ID 입력"
                  className="h-7 w-40 text-[12px]"
                />
                <button
                  type="button"
                  onClick={addAwsId}
                  className="flex h-[26px] items-center gap-1 rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-400 hover:bg-zinc-50"
                >
                  <Plus className="h-3 w-3" />
                  추가
                </button>
              </div>
            )}
          </div>
          {awsIds.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {awsIds.map((id) => (
                <span key={id} className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-[13px] font-medium text-blue-600">
                  {id}
                  {editing && (
                    <button type="button" onClick={() => removeAwsId(id)} className="text-blue-300 hover:text-blue-500">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-zinc-400">등록된 AWS 계정이 없습니다</p>
          )}
        </div>

        <div className="h-px bg-zinc-100" />

        {/* 태그 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-zinc-400">태그</p>
            {editing && (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="태그 입력"
                  className="h-7 w-32 text-[12px]"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="flex h-[26px] items-center gap-1 rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-400 hover:bg-zinc-50"
                >
                  <Plus className="h-3 w-3" />
                  추가
                </button>
              </div>
            )}
          </div>
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1.5 rounded-md bg-zinc-100 px-2.5 py-1 text-[13px] font-medium text-zinc-600">
                  {tag}
                  {editing && (
                    <button type="button" onClick={() => removeTag(tag)} className="text-zinc-400 hover:text-zinc-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-zinc-400">등록된 태그가 없습니다</p>
          )}
        </div>

        <div className="h-px bg-zinc-100" />

        {/* 메모 */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400">메모</p>
          {editing ? (
            <textarea
              value={(val('memo') as string) ?? ''}
              onChange={(e) => setField('memo', e.target.value)}
              rows={3}
              className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-blue-400"
              placeholder="메모를 입력하세요"
            />
          ) : (
            <p className="text-sm leading-relaxed text-zinc-900">{detail?.memo || '-'}</p>
          )}
        </div>
      </div>
    </div>
  );
}

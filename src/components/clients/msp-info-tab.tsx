'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil } from 'lucide-react';
import { INDUSTRY_OPTIONS, COMPANY_SIZE_OPTIONS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

interface MspDetail {
  id: string;
  industry: string | null;
  company_size: string | null;
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

  function handleCancel() {
    setEditValues({});
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    try {
      const updateData: Record<string, unknown> = {};
      if ('industry' in editValues) updateData.industry = editValues.industry || null;
      if ('company_size' in editValues) updateData.company_size = editValues.company_size || null;
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

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil } from 'lucide-react';
import { CLIENT_TYPES, CLIENT_GRADES, BUSINESS_TYPES, CLIENT_STATUS_OPTIONS } from '@/lib/constants';
import { clientUpdateSchema } from '@/lib/validators/client';
import { useUpdateClient } from '@/hooks/use-client-mutations';
import type { ClientRow } from '@/lib/services/client-service';
import { toast } from 'sonner';

interface ClientInfoCardProps {
  client: ClientRow;
}

export function ClientInfoCard({ client }: ClientInfoCardProps) {
  const [editing, setEditing] = useState(false);
  const [editBusinessTypes, setEditBusinessTypes] = useState<string[]>(client.business_types ?? []);
  const updateClient = useUpdateClient(client.id);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const raw = {
      name: formData.get('name') as string,
      clientType: formData.get('clientType') as string,
      grade: formData.get('grade') || undefined,
      status: formData.get('status') || undefined,
      businessTypes: editBusinessTypes,
      memo: formData.get('memo') || null,
    };
    const result = clientUpdateSchema.safeParse(raw);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? '입력을 확인해주세요');
      return;
    }
    await updateClient.mutateAsync(result.data);
    toast.success('고객 정보가 수정되었습니다');
    setEditing(false);
  }

  function toggleEditBizType(type: string) {
    setEditBusinessTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  if (editing) {
    return (
      <form onSubmit={handleSave} className="rounded-xl border border-zinc-200 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">고객 정보</h3>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); setEditBusinessTypes(client.business_types ?? []); }}>취소</Button>
            <Button type="submit" size="sm" disabled={updateClient.isPending} className="bg-blue-600 hover:bg-blue-700">저장</Button>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <Label>고객사명</Label>
            <Input name="name" defaultValue={client.name} />
          </div>
          <div className="space-y-1.5">
            <Label>유형</Label>
            <Select name="clientType" defaultValue={client.client_type}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(CLIENT_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>등급</Label>
            <Select name="grade" defaultValue={client.grade ?? ''}>
              <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
              <SelectContent>
                {CLIENT_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>상태</Label>
            <Select name="status" defaultValue={client.status ?? '상태없음'}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CLIENT_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>비즈니스 타입</Label>
            <div className="flex gap-1.5 pt-1">
              {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleEditBizType(key)}
                  className={`rounded px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    editBusinessTypes.includes(key)
                      ? ({ msp: 'bg-blue-100 text-blue-600', tt: 'bg-amber-100 text-amber-700', dev: 'bg-zinc-200 text-zinc-700' }[key] ?? 'bg-blue-100 text-blue-600')
                      : 'bg-zinc-100 text-zinc-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>메모</Label>
          <Textarea name="memo" defaultValue={client.memo ?? ''} rows={3} />
        </div>
      </form>
    );
  }

  const BIZ_BADGE_COLORS: Record<string, string> = {
    msp: 'bg-blue-100 text-blue-600',
    tt: 'bg-amber-100 text-amber-700',
    dev: 'bg-zinc-100 text-zinc-600',
  };

  return (
    <div className="rounded-xl border border-zinc-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900">고객 정보</h3>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex h-[30px] items-center gap-1 rounded-md border border-zinc-200 px-2.5 text-xs font-medium text-zinc-400 transition-colors hover:bg-zinc-50"
        >
          <Pencil className="h-[13px] w-[13px]" />
          수정
        </button>
      </div>

      <div className="grid grid-cols-5 gap-8">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">고객사명</p>
          <p className="text-[15px] font-medium text-zinc-900">{client.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">고객 유형</p>
          <p className="text-[15px] font-medium text-zinc-900">
            {CLIENT_TYPES[client.client_type as keyof typeof CLIENT_TYPES]}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">등급</p>
          {client.grade ? (
            <span className="inline-block rounded bg-blue-50 px-2.5 py-0.5 text-[13px] font-semibold text-blue-600">
              {client.grade}
            </span>
          ) : (
            <p className="text-[15px] font-medium text-zinc-900">-</p>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">상태</p>
          {(() => {
            const STATUS_COLORS: Record<string, string> = {
              '신규': 'bg-violet-100 text-violet-600',
              '진행중': 'bg-indigo-100 text-indigo-600',
              '활성': 'bg-emerald-100 text-emerald-600',
              '휴면': 'bg-zinc-100 text-zinc-500',
              '종료': 'bg-rose-100 text-rose-600',
              '상태없음': 'bg-zinc-100 text-zinc-400',
            };
            const status = client.status ?? '상태없음';
            return (
              <span className={`inline-block rounded px-2.5 py-0.5 text-[13px] font-semibold ${STATUS_COLORS[status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                {status}
              </span>
            );
          })()}
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-zinc-400">비즈니스 타입</p>
          <div className="flex gap-1.5">
            {client.business_types && client.business_types.length > 0 ? (
              client.business_types.map((bt: string) => (
                <span
                  key={bt}
                  className={`inline-block rounded px-2.5 py-0.5 text-[11px] font-semibold ${BIZ_BADGE_COLORS[bt] ?? 'bg-zinc-100 text-zinc-600'}`}
                >
                  {BUSINESS_TYPES[bt as keyof typeof BUSINESS_TYPES] ?? bt}
                </span>
              ))
            ) : (
              <p className="text-[15px] font-medium text-zinc-900">-</p>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-zinc-100" />

      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-400">메모</p>
        <p className="text-sm leading-relaxed text-zinc-900">
          {client.memo || '-'}
        </p>
      </div>
    </div>
  );
}

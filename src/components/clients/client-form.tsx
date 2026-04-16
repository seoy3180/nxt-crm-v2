'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CLIENT_TYPES, CLIENT_GRADES, BUSINESS_TYPES, CLIENT_STATUS_OPTIONS } from '@/lib/constants';
import { clientCreateSchema } from '@/lib/validators/client';
import { useCreateClient } from '@/hooks/use-client-mutations';
import { useClients } from '@/hooks/use-clients';
import { useSectionBasePath } from '@/hooks/use-section-base-path';
import { toast } from 'sonner';

interface ClientFormProps {
  defaultBusinessTypes?: string[];
  hideBusinessTypes?: boolean;
  hideGrade?: boolean;
}

export function ClientForm({ defaultBusinessTypes, hideBusinessTypes, hideGrade }: ClientFormProps = {}) {
  const router = useRouter();
  const basePath = useSectionBasePath();
  const createClient = useCreateClient();
  const { data: clientsData } = useClients({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' });
  const allClients = clientsData?.data ?? [];

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>(defaultBusinessTypes ?? []);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [parentOpen, setParentOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw: Record<string, unknown> = {
      name: formData.get('name') as string,
      clientType: formData.get('clientType') as string,
      grade: formData.get('grade') || undefined,
      status: formData.get('status') || undefined,
      businessTypes: selectedBusinessTypes,
      parentId: selectedParentId,
      memo: formData.get('memo') || null,
    };

    const result = clientCreateSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const field = String(err.path[0]);
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const data = await createClient.mutateAsync(result.data);

    // 비즈니스 타입별 상세 저장
    const { createClient: createSupabase } = await import('@/lib/supabase/client');
    const supabase = createSupabase();

    if (selectedBusinessTypes.includes('msp')) {
      const mspData = {
        client_id: data.id,
        industry: formData.get('industry') || null,
        company_size: formData.get('companySize') || null,
        memo: formData.get('mspMemo') || null,
      };
      await supabase.from('client_msp_details').insert(mspData as { client_id: string });
    }

    if (selectedBusinessTypes.includes('tt')) {
      const eduData = {
        client_id: data.id,
        memo: formData.get('eduMemo') || null,
      };
      await supabase.from('client_edu_details').insert(eduData as { client_id: string });
    }

    toast.success('고객이 등록되었습니다');
    router.push(`${basePath}/clients/${data.id}`);
  }

  function toggleBusinessType(type: string) {
    setSelectedBusinessTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-[640px] space-y-5">
      {/* 비즈니스 타입 */}
      {!hideBusinessTypes && (
        <div className="space-y-1.5">
          <Label>비즈니스 타입</Label>
          <div className="flex gap-2">
            {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                variant={selectedBusinessTypes.includes(key) ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleBusinessType(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 고객명 */}
      <div className="space-y-1.5">
        <Label htmlFor="name">고객명 *</Label>
        <Input id="name" name="name" placeholder="고객명을 입력하세요" autoFocus />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* 고객 유형 + 등급 */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="clientType">고객 유형 *</Label>
          <Select name="clientType">
            <SelectTrigger>
              <SelectValue placeholder="유형 선택" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CLIENT_TYPES).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.clientType && <p className="text-sm text-red-500">{errors.clientType}</p>}
        </div>
        {!hideGrade && (
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="grade">등급</Label>
            <Select name="grade">
              <SelectTrigger>
                <SelectValue placeholder="등급 선택" />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="status">상태</Label>
          <Select name="status" defaultValue="상태없음">
            <SelectTrigger>
              <SelectValue placeholder="상태 선택" />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 상위 고객 */}
      <div className="space-y-1.5">
        <Label>상위 고객</Label>
        <Popover open={parentOpen} onOpenChange={setParentOpen}>
          <PopoverTrigger
            className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm transition-colors hover:bg-zinc-50"
          >
            <span className={selectedParentId ? 'text-zinc-900' : 'text-zinc-400'}>
              {selectedParentId
                ? allClients.find((c) => c.id === selectedParentId)?.name ?? '선택됨'
                : '상위 고객 검색 (선택사항)'}
            </span>
            <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
          </PopoverTrigger>
          <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="고객명 검색..." />
              <CommandList>
                <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                <CommandGroup>
                  {selectedParentId && (
                    <CommandItem
                      value="__clear__"
                      onSelect={() => { setSelectedParentId(null); setParentOpen(false); }}
                    >
                      <span className="text-zinc-400">선택 해제</span>
                    </CommandItem>
                  )}
                  {allClients.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.client_id}`}
                      onSelect={() => { setSelectedParentId(c.id); setParentOpen(false); }}
                    >
                      <Check className={cn('mr-2 h-4 w-4', selectedParentId === c.id ? 'opacity-100' : 'opacity-0')} />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* 메모 */}
      <div className="space-y-1.5">
        <Label htmlFor="memo">메모</Label>
        <Textarea id="memo" name="memo" placeholder={selectedBusinessTypes.length > 0 ? "전사 공유 메모 (다른 팀과 공유되는 정보)" : "메모를 입력하세요"} rows={3} />
      </div>

      {/* MSP 상세 */}
      {selectedBusinessTypes.includes('msp') && (
        <>
          <div className="h-px bg-zinc-200" />
          <h3 className="text-base font-semibold text-zinc-900">MSP 정보</h3>

          <div className="flex gap-4">
            <div className="flex-1 space-y-1.5">
              <Label>산업군</Label>
              <Select name="industry">
                <SelectTrigger><SelectValue placeholder="산업군 선택" /></SelectTrigger>
                <SelectContent>
                  {['IT', '제조', '금융', '유통', '공공', '서울대 연구실', '기타'].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1.5">
              <Label>기업 규모</Label>
              <Select name="companySize">
                <SelectTrigger><SelectValue placeholder="규모 선택" /></SelectTrigger>
                <SelectContent>
                  {['스타트업', '중소기업', '중견기업', '대기업', '공공기관'].map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>MSP 메모</Label>
            <Textarea name="mspMemo" placeholder="MSP팀 내부 메모" rows={2} />
          </div>
        </>
      )}

      {/* 교육 상세 */}
      {selectedBusinessTypes.includes('tt') && (
        <>
          <div className="h-px bg-zinc-200" />
          <h3 className="text-base font-semibold text-zinc-900">교육 정보</h3>

          <div className="space-y-1.5">
            <Label>교육 메모</Label>
            <Textarea name="eduMemo" placeholder="교육팀 내부 메모" rows={2} />
          </div>
        </>
      )}

      {/* 버튼 */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          취소
        </Button>
        <Button
          type="submit"
          disabled={createClient.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {createClient.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </form>
  );
}

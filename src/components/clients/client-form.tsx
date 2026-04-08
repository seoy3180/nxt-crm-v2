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
import { CLIENT_TYPES, CLIENT_GRADES, BUSINESS_TYPES } from '@/lib/constants';
import { clientCreateSchema } from '@/lib/validators/client';
import { useCreateClient } from '@/hooks/use-client-mutations';
import { useClients } from '@/hooks/use-clients';

export function ClientForm() {
  const router = useRouter();
  const createClient = useCreateClient();
  const { data: clientsData } = useClients({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' });
  const allClients = clientsData?.data ?? [];

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);
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
    router.push(`/clients/${data.id}`);
  }

  function toggleBusinessType(type: string) {
    setSelectedBusinessTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-[640px] space-y-5">
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

      {/* 비즈니스 타입 */}
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

      {/* 메모 */}
      <div className="space-y-1.5">
        <Label htmlFor="memo">메모</Label>
        <Textarea id="memo" name="memo" placeholder="메모를 입력하세요" rows={3} />
      </div>

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

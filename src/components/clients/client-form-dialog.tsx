'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CLIENT_TYPES, CLIENT_GRADES, BUSINESS_TYPES } from '@/lib/constants';
import { clientCreateSchema } from '@/lib/validators/client';
import { useCreateClient } from '@/hooks/use-client-mutations';
import { useClients } from '@/hooks/use-clients';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (client: { id: string; name: string }) => void;
}

export function ClientFormDialog({ open, onOpenChange, onCreated }: ClientFormDialogProps) {
  const createClient = useCreateClient();
  const { data: clientsData } = useClients({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' });
  const parents = clientsData?.data ?? [];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedBusinessTypes, setSelectedBusinessTypes] = useState<string[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [parentExpanded, setParentExpanded] = useState(false);

  function toggleBusinessType(type: string) {
    setSelectedBusinessTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
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
        fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const data = await createClient.mutateAsync(result.data);
    setSelectedBusinessTypes([]);
    onOpenChange(false);
    onCreated?.({ id: data.id, name: data.name });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>새 고객 등록</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dlg-client-name">고객명 *</Label>
            <Input id="dlg-client-name" name="name" placeholder="고객명을 입력하세요" autoFocus />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>고객 유형 *</Label>
              <Select name="clientType">
                <SelectTrigger><SelectValue placeholder="유형 선택" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_TYPES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientType && <p className="text-sm text-red-500">{errors.clientType}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>등급</Label>
              <Select name="grade">
                <SelectTrigger><SelectValue placeholder="등급 선택" /></SelectTrigger>
                <SelectContent>
                  {CLIENT_GRADES.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>상위 고객</Label>
            {!parentExpanded ? (
              <button
                type="button"
                onClick={() => setParentExpanded(true)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm transition-colors hover:bg-zinc-50"
              >
                <span className={selectedParentId ? 'text-zinc-900' : 'text-zinc-400'}>
                  {selectedParentId
                    ? parents.find((p) => p.id === selectedParentId)?.name ?? '선택됨'
                    : '상위 고객 검색 (선택사항)'}
                </span>
                <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
              </button>
            ) : (
              <div className="rounded-md border border-zinc-200">
                <Command>
                  <div className="relative">
                    <CommandInput placeholder="고객명 검색..." className="h-10 pr-10" autoFocus />
                    <button
                      type="button"
                      onClick={() => setParentExpanded(false)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      <ChevronsUpDown className="h-4 w-4" />
                    </button>
                  </div>
                  <CommandList className="max-h-[160px]">
                    <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                    <CommandGroup>
                      {selectedParentId && (
                        <CommandItem value="__clear__" onSelect={() => { setSelectedParentId(null); setParentExpanded(false); }}>
                          <span className="text-zinc-400">선택 해제</span>
                        </CommandItem>
                      )}
                      {parents.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => { setSelectedParentId(p.id); setParentExpanded(false); }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', selectedParentId === p.id ? 'opacity-100' : 'opacity-0')} />
                          {p.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="dlg-client-memo">메모</Label>
            <Textarea id="dlg-client-memo" name="memo" placeholder="메모를 입력하세요" rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={createClient.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createClient.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Search, Plus, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClients } from '@/hooks/use-clients';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';
import { toast } from 'sonner';

export default function MspContactsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 연락처 추가 모달
  const [addOpen, setAddOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', department: '', position: '', phone: '', email: '' });
  const [addLoading, setAddLoading] = useState(false);

  const { data: clientsData } = useClients({ page: 1, pageSize: 200, sortBy: 'name', sortOrder: 'asc' });
  const mspClients = (clientsData?.data ?? []).filter((c) => c.business_types?.includes('msp'));

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(value), SEARCH_DEBOUNCE_MS);
  }, []);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['msp-contacts', debouncedSearch],
    queryFn: async () => {
      const supabase = createClient();
      const q = supabase
        .from('contacts')
        .select('id, name, email, phone, department, position, client_id, clients!contacts_client_id_fkey(name, business_types)')
        .is('deleted_at', null)
        .order('name', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      const searchLower = debouncedSearch.toLowerCase();
      return (data ?? [])
        .filter((c) => {
          const biz = (c.clients as { business_types: string[] } | null)?.business_types ?? [];
          if (!biz.includes('msp')) return false;
          if (!searchLower) return true;
          const clientName = (c.clients as { name: string } | null)?.name ?? '';
          return (
            c.name.toLowerCase().includes(searchLower) ||
            clientName.toLowerCase().includes(searchLower) ||
            (c.phone ?? '').includes(searchLower) ||
            (c.email ?? '').toLowerCase().includes(searchLower)
          );
        })
        .map((c) => ({
          id: c.id,
          name: c.name,
          clientName: (c.clients as { name: string } | null)?.name ?? '-',
          clientId: c.client_id,
          department: c.department,
          position: c.position,
          phone: c.phone,
          email: c.email,
        }));
    },
  });

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClientId || !addForm.name.trim()) {
      toast.error('고객과 이름은 필수입니다');
      return;
    }

    setAddLoading(true);
    try {
      const supabase = createClient();
      await supabase.from('contacts').insert({
        client_id: selectedClientId,
        name: addForm.name,
        department: addForm.department || null,
        position: addForm.position || null,
        phone: addForm.phone || null,
        email: addForm.email || null,
      });
      queryClient.invalidateQueries({ queryKey: ['msp-contacts'] });
      toast.success('연락처가 추가되었습니다');
      setAddOpen(false);
      setSelectedClientId('');
      setSelectedClientName('');
      setAddForm({ name: '', department: '', position: '', phone: '', email: '' });
    } catch {
      toast.error('추가에 실패했습니다');
    }
    setAddLoading(false);
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">MSP 연락처</h1>

      <div className="flex items-center gap-2">
        <div className="flex-1" />
        <div className="relative w-60">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input placeholder="이름, 고객사, 전화, 이메일 검색..." value={search} onChange={(e) => handleSearch(e.target.value)} className="h-8 rounded-md border-zinc-200 pl-9 text-[13px]" />
        </div>
        <Button onClick={() => setAddOpen(true)} className="h-9 gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          연락처 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead className="h-10 px-4 text-xs font-semibold text-zinc-500">이름</TableHead>
                <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">고객사</TableHead>
                <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">부서</TableHead>
                <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">직책</TableHead>
                <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">전화</TableHead>
                <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">이메일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!contacts || contacts.length === 0) ? (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-zinc-400">등록된 연락처가 없습니다</TableCell></TableRow>
              ) : (
                contacts.map((c) => (
                  <TableRow
                    key={c.id}
                    tabIndex={0}
                    className="h-11 cursor-pointer border-b border-zinc-100 hover:bg-zinc-50"
                    onClick={() => router.push(`/clients/${c.clientId}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/clients/${c.clientId}`); }}
                  >
                    <TableCell className="px-4 text-sm font-medium text-zinc-900">{c.name}</TableCell>
                    <TableCell className="px-4 text-center text-[13px] text-zinc-500">{c.clientName}</TableCell>
                    <TableCell className="px-4 text-center text-[13px] text-zinc-500">{c.department ?? '-'}</TableCell>
                    <TableCell className="px-4 text-center text-[13px] text-zinc-500">{c.position ?? '-'}</TableCell>
                    <TableCell className="px-4 text-center text-[13px] text-zinc-500">{c.phone ?? '-'}</TableCell>
                    <TableCell className="px-4 text-center text-[13px] text-zinc-500">{c.email ?? '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 연락처 추가 모달 */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>연락처 추가</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddContact} className="space-y-4">
            {/* 고객 선택 */}
            <div className="space-y-1.5">
              <Label>고객 *</Label>
              <Popover open={clientPopoverOpen} onOpenChange={setClientPopoverOpen}>
                <PopoverTrigger className="flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 text-sm hover:bg-zinc-50">
                  <span className={selectedClientId ? 'text-zinc-900' : 'text-zinc-400'}>
                    {selectedClientName || 'MSP 고객 검색...'}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 text-zinc-400" />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="고객명 검색..." />
                    <CommandList>
                      <CommandEmpty>검색 결과가 없습니다</CommandEmpty>
                      <CommandGroup>
                        {mspClients.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            onSelect={() => { setSelectedClientId(c.id); setSelectedClientName(c.name); setClientPopoverOpen(false); }}
                          >
                            <Check className={cn('mr-2 h-4 w-4', selectedClientId === c.id ? 'opacity-100' : 'opacity-0')} />
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* 이름 */}
            <div className="space-y-1.5">
              <Label>이름 *</Label>
              <Input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="이름" autoFocus />
            </div>

            {/* 부서 + 직책 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>부서</Label>
                <Input value={addForm.department} onChange={(e) => setAddForm({ ...addForm, department: e.target.value })} placeholder="부서" />
              </div>
              <div className="space-y-1.5">
                <Label>직책</Label>
                <Input value={addForm.position} onChange={(e) => setAddForm({ ...addForm, position: e.target.value })} placeholder="직책" />
              </div>
            </div>

            {/* 전화 + 이메일 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>전화</Label>
                <Input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="010-0000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>이메일</Label>
                <Input value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} type="email" placeholder="email@example.com" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>취소</Button>
              <Button type="submit" disabled={addLoading} className="bg-blue-600 hover:bg-blue-700">
                {addLoading ? '추가 중...' : '추가'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

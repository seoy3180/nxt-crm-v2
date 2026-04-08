'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';

export default function MspContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(value), SEARCH_DEBOUNCE_MS);
  }, []);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['msp-contacts', debouncedSearch],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from('contacts')
        .select('id, name, email, phone, department, position, client_id, clients!contacts_client_id_fkey(name, business_types)')
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`);
      const { data, error } = await q;
      if (error) throw error;
      // MSP 고객의 연락처만 필터
      return (data ?? [])
        .filter((c) => {
          const biz = (c.clients as { business_types: string[] } | null)?.business_types ?? [];
          return biz.includes('msp');
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

  return (
    <div className="flex flex-1 flex-col gap-5">
      <h1 className="text-2xl font-semibold text-zinc-900">MSP 연락처</h1>

      <div className="relative w-60">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input placeholder="이름 검색..." value={search} onChange={(e) => handleSearch(e.target.value)} className="h-8 rounded-md border-zinc-200 pl-9 text-[13px]" />
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
    </div>
  );
}

'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search } from 'lucide-react';
import { SEARCH_DEBOUNCE_MS } from '@/lib/constants';

export default function MspClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedSearch(value), SEARCH_DEBOUNCE_MS);
  }, []);

  const { data: clients, isLoading } = useQuery({
    queryKey: ['msp-clients', debouncedSearch],
    queryFn: async () => {
      const supabase = createClient();
      let q = supabase
        .from('clients')
        .select('id, name, client_msp_details(msp_grade, aws_am)')
        .contains('business_types', ['msp'])
        .is('deleted_at', null)
        .order('name', { ascending: true });
      if (debouncedSearch) q = q.ilike('name', `%${debouncedSearch}%`);
      const { data, error } = await q;
      if (error) throw error;

      // 계약수 별도 조회
      const { data: contractCounts } = await supabase
        .from('contracts')
        .select('client_id')
        .eq('type', 'msp')
        .is('deleted_at', null);
      const countMap = new Map<string, number>();
      (contractCounts ?? []).forEach((c) => countMap.set(c.client_id, (countMap.get(c.client_id) ?? 0) + 1));

      return (data ?? []).map((c) => {
        const msp = Array.isArray(c.client_msp_details) ? c.client_msp_details[0] : c.client_msp_details;
        return {
          id: c.id,
          name: c.name,
          mspGrade: (msp as { msp_grade: string | null } | null)?.msp_grade ?? null,
          awsAm: (msp as { aws_am: string | null } | null)?.aws_am ?? null,
          contractCount: countMap.get(c.id) ?? 0,
        };
      });
    },
  });

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900">MSP 고객</h1>
        <Link href="/clients/new">
          <button className="flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            새 고객
          </button>
        </Link>
      </div>

      <div className="relative w-60">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input placeholder="고객명 검색..." value={search} onChange={(e) => handleSearch(e.target.value)} className="h-8 rounded-md border-zinc-200 pl-9 text-[13px]" />
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead className="h-10 px-4 text-xs font-semibold text-zinc-500">고객명</TableHead>
                <TableHead className="h-10 w-[100px] px-4 text-center text-xs font-semibold text-zinc-500">MSP 등급</TableHead>
                <TableHead className="h-10 w-[120px] px-4 text-center text-xs font-semibold text-zinc-500">AWS AM</TableHead>
                <TableHead className="h-10 w-[80px] px-4 text-center text-xs font-semibold text-zinc-500">계약 수</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!clients || clients.length === 0) ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center text-zinc-400">MSP 고객이 없습니다</TableCell></TableRow>
              ) : (
                clients.map((c) => (
                  <TableRow key={c.id} tabIndex={0} className="h-11 cursor-pointer border-b border-zinc-100 hover:bg-zinc-50" onClick={() => router.push(`/clients/${c.id}`)} onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/clients/${c.id}`); }}>
                    <TableCell className="px-4 text-sm font-medium text-zinc-900">{c.name}</TableCell>
                    <TableCell className="w-[100px] px-4 text-center">
                      {c.mspGrade ? <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">{c.mspGrade}</span> : '-'}
                    </TableCell>
                    <TableCell className="w-[120px] px-4 text-center text-[13px] text-zinc-500">{c.awsAm ?? '-'}</TableCell>
                    <TableCell className="w-[80px] px-4 text-center text-[13px] text-zinc-500">{c.contractCount}</TableCell>
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

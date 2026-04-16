'use client';

import { useRouter } from 'next/navigation';
import { formatAmount, getStageColor } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ContractRow } from '@/lib/services/contract-service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BUSINESS_TYPES, MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import { useSectionBasePath } from '@/hooks/use-section-base-path';

interface RelatedContractsProps {
  clientId: string;
  childClientIds?: string[];
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '미지정';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}


export function RelatedContracts({ clientId, childClientIds }: RelatedContractsProps) {
  const router = useRouter();
  const basePath = useSectionBasePath();
  const hasChildren = (childClientIds ?? []).length > 0;
  const targetIds = [clientId, ...(childClientIds ?? [])];

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['related-contracts', clientId, childClientIds],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contracts')
        .select('*, clients!contracts_client_id_fkey(name), profiles!contracts_assigned_to_fkey(name), contacts!contracts_contact_id_fkey(name)')
        .in('client_id', targetIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => ({
        ...row,
        client_name: (row.clients as { name: string } | null)?.name ?? null,
        assigned_to_name: (row.profiles as { name: string } | null)?.name ?? null,
        client_contact_name: (row.contacts as { name: string } | null)?.name ?? null,
      })) as unknown as ContractRow[];
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="pl-2 text-lg font-semibold text-zinc-900">
          관련 계약 <span className="text-zinc-400">({contracts.length}건){childClientIds && childClientIds.length > 0 ? ' — 하위 고객 포함' : ''}</span>
        </h3>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              {hasChildren && <TableHead className="h-10 w-[140px] px-4 text-xs font-semibold text-zinc-500">고객</TableHead>}
              <TableHead className="h-10 px-4 text-xs font-semibold text-zinc-500">계약명</TableHead>
              <TableHead className="h-10 w-[80px] px-4 text-center text-xs font-semibold text-zinc-500">타입</TableHead>
              <TableHead className="h-10 w-[100px] px-4 text-center text-xs font-semibold text-zinc-500">단계</TableHead>
              <TableHead className="h-10 w-[120px] px-4 text-center text-xs font-semibold text-zinc-500">사내 담당자</TableHead>
              <TableHead className="h-10 w-[120px] px-4 text-center text-xs font-semibold text-zinc-500">고객사 담당자</TableHead>
              <TableHead className="h-10 w-[120px] px-4 text-center text-xs font-semibold text-zinc-500">금액</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={hasChildren ? 7 : 6} className="h-16 text-center text-zinc-400">
                  관련 계약이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((c) => (
                <TableRow key={c.id} tabIndex={0} className="h-11 cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none" onClick={() => router.push(`${basePath}/contracts/${c.id}`)} onKeyDown={(e) => { if (e.key === 'Enter') router.push(`${basePath}/contracts/${c.id}`); }}>
                  {hasChildren && <TableCell className="w-[140px] px-4 text-sm font-medium text-zinc-900">{c.client_name ?? '-'}</TableCell>}
                  <TableCell className="px-4 text-sm font-medium text-zinc-900">{c.name}</TableCell>
                  <TableCell className="w-[80px] px-4 text-center">
                    {(() => {
                      const colors: Record<string, string> = { msp: 'bg-blue-100 text-blue-600', tt: 'bg-amber-100 text-amber-700', dev: 'bg-zinc-100 text-zinc-600' };
                      return (
                        <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${colors[c.type] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {BUSINESS_TYPES[c.type as keyof typeof BUSINESS_TYPES] ?? c.type}
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="w-[100px] px-4 text-center">
                    <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${getStageColor(c.stage)}`}>
                      {getStageLabel(c.stage, c.type)}
                    </span>
                  </TableCell>
                  <TableCell className="w-[120px] px-4 text-center text-[13px] text-zinc-500">{c.assigned_to_name ?? '-'}</TableCell>
                  <TableCell className="w-[120px] px-4 text-center text-[13px] text-zinc-500">{c.client_contact_name ?? '-'}</TableCell>
                  <TableCell className="w-[120px] px-4 text-center text-[13px] font-medium text-zinc-900">{formatAmount(c.total_amount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

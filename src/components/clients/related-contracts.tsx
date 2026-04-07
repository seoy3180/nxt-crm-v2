'use client';

import { useRouter } from 'next/navigation';
import { useContracts } from '@/hooks/use-contracts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BUSINESS_TYPES, MSP_STAGES, EDU_STAGES } from '@/lib/constants';

interface RelatedContractsProps {
  clientId: string;
  childClientIds?: string[];
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '미지정';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function RelatedContracts({ clientId, childClientIds }: RelatedContractsProps) {
  const router = useRouter();
  const { data, isLoading } = useContracts({ page: 1, pageSize: 100, sortBy: 'created_at', sortOrder: 'desc' });

  const targetIds = new Set([clientId, ...(childClientIds ?? [])]);
  const contracts = data?.data?.filter((c) => targetIds.has(c.client_id)) ?? [];

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
                <TableCell colSpan={6} className="h-16 text-center text-zinc-400">
                  관련 계약이 없습니다
                </TableCell>
              </TableRow>
            ) : (
              contracts.map((c) => (
                <TableRow key={c.id} className="h-11 cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50" onClick={() => router.push(`/contracts/${c.id}`)}>
                  <TableCell className="px-4 text-sm font-medium text-zinc-900">{c.name}</TableCell>
                  <TableCell className="w-[80px] px-4 text-center">
                    <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                      {BUSINESS_TYPES[c.type as keyof typeof BUSINESS_TYPES] ?? c.type}
                    </span>
                  </TableCell>
                  <TableCell className="w-[100px] px-4 text-center">
                    <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
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

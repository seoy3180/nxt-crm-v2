'use client';

import { useRouter } from 'next/navigation';
import { formatAmount, getStageColor } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { BUSINESS_TYPES, MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import type { ContractRow } from '@/lib/services/contract-service';

interface ContractTableProps {
  contracts: ContractRow[];
  loading?: boolean;
  contractType: string;
}

function getStageBadge(stage: string | null, type: string) {
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  const label = stage ? (stages.find((s) => s.value === stage)?.label ?? stage) : '미지정';
  return <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${getStageColor(stage)}`}>{label}</span>;
}

function getTypeBadge(type: string) {
  const label = BUSINESS_TYPES[type as keyof typeof BUSINESS_TYPES] ?? type;
  return <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-600">{label}</span>;
}


export function ContractTable({ contracts, loading, contractType }: ContractTableProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50">
            <TableHead className="h-10 px-6 text-xs font-semibold text-zinc-500">계약명</TableHead>
            <TableHead className="h-10 w-[140px] px-2 text-xs font-semibold text-zinc-500">고객</TableHead>
            <TableHead className="h-10 w-[80px] px-2 text-xs font-semibold text-zinc-500">타입</TableHead>
            <TableHead className="h-10 w-[100px] px-2 text-xs font-semibold text-zinc-500">단계</TableHead>
            <TableHead className="h-10 w-[110px] px-2 text-xs font-semibold text-zinc-500">사내 담당자</TableHead>
            <TableHead className="h-10 w-[110px] px-2 text-xs font-semibold text-zinc-500">고객사 담당자</TableHead>
            <TableHead className="h-10 w-[110px] px-2 text-xs font-semibold text-zinc-500">금액</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-zinc-400">
                등록된 계약이 없습니다
              </TableCell>
            </TableRow>
          ) : (
            contracts.map((contract) => (
              <TableRow
                key={contract.id}
                className="h-11 cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50"
                tabIndex={0}
                onClick={() => router.push(`/contracts/${contract.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/contracts/${contract.id}`); }}
              >
                <TableCell className="px-6 text-sm font-medium text-zinc-900">{contract.name}</TableCell>
                <TableCell className="px-2 text-[13px] text-zinc-500">{contract.client_name ?? '-'}</TableCell>
                <TableCell className="px-2">{getTypeBadge(contract.type)}</TableCell>
                <TableCell className="px-2">{getStageBadge(contract.stage, contractType)}</TableCell>
                <TableCell className="px-2 text-[13px] text-zinc-500">{contract.assigned_to_name ?? '-'}</TableCell>
                <TableCell className="px-2 text-[13px] text-zinc-500">{contract.client_contact_name ?? '-'}</TableCell>
                <TableCell className="px-2 text-[13px] font-medium text-zinc-900">{formatAmount(contract.total_amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

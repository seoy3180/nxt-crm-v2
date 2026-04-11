'use client';

import { useEducationOps } from '@/hooks/use-education-ops';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

interface EduOperationsTableProps {
  contractId: string;
}

export function EduOperationsTable({ contractId }: EduOperationsTableProps) {
  const { data: ops, isLoading } = useEducationOps(contractId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="rounded-xl border border-zinc-200 p-6 space-y-4">
      <h3 className="text-lg font-semibold text-zinc-900">교육 운영</h3>
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50">
              <TableHead className="h-10 px-4 text-xs font-semibold text-zinc-500">운영명</TableHead>
              <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">장소</TableHead>
              <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">기간</TableHead>
              <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">인원</TableHead>
              <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">시간</TableHead>
              <TableHead className="h-10 px-4 text-center text-xs font-semibold text-zinc-500">중식/간식</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!ops || ops.length === 0) ? (
              <TableRow>
                <TableCell colSpan={6} className="h-16 text-center text-zinc-400">등록된 운영이 없습니다</TableCell>
              </TableRow>
            ) : (
              ops.map((op) => (
                <TableRow key={op.id} className="h-11 border-b border-zinc-100">
                  <TableCell className="px-4 text-sm font-medium text-zinc-900">{op.operation_name}</TableCell>
                  <TableCell className="px-4 text-center text-[13px] text-zinc-500">{op.location ?? '-'}</TableCell>
                  <TableCell className="px-4 text-center text-[13px] text-zinc-500">
                    {op.start_date && op.end_date ? `${op.start_date} ~ ${op.end_date}` : '-'}
                  </TableCell>
                  <TableCell className="px-4 text-center text-[13px] text-zinc-500">{op.contracted_count ?? '-'}</TableCell>
                  <TableCell className="px-4 text-center text-[13px] text-zinc-500">{op.total_hours ? `${op.total_hours}h` : '-'}</TableCell>
                  <TableCell className="px-4 text-center">
                    <div className="flex justify-center gap-1">
                      {op.provides_lunch && <span className="rounded bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-600">중식</span>}
                      {op.provides_snack && <span className="rounded bg-green-50 px-1.5 py-0.5 text-[11px] font-medium text-green-600">간식</span>}
                      {!op.provides_lunch && !op.provides_snack && <span className="text-[13px] text-zinc-400">-</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

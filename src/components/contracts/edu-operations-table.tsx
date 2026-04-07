'use client';

import { useEducationOps } from '@/hooks/use-education-ops';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface EduOperationsTableProps {
  contractId: string;
}

export function EduOperationsTable({ contractId }: EduOperationsTableProps) {
  const { data: ops, isLoading } = useEducationOps(contractId);

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>운영명</TableHead>
            <TableHead>장소</TableHead>
            <TableHead>기간</TableHead>
            <TableHead>인원</TableHead>
            <TableHead>시간</TableHead>
            <TableHead>중식/간식</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(!ops || ops.length === 0) ? (
            <TableRow>
              <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">등록된 운영이 없습니다</TableCell>
            </TableRow>
          ) : (
            ops.map((op) => (
              <TableRow key={op.id}>
                <TableCell className="font-medium">{op.operation_name}</TableCell>
                <TableCell>{op.location ?? '-'}</TableCell>
                <TableCell className="text-xs">
                  {op.start_date && op.end_date ? `${op.start_date} ~ ${op.end_date}` : '-'}
                </TableCell>
                <TableCell>{op.contracted_count ?? '-'}</TableCell>
                <TableCell>{op.total_hours ? `${op.total_hours}h` : '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {op.provides_lunch && <Badge variant="secondary" className="text-xs">중식</Badge>}
                    {op.provides_snack && <Badge variant="secondary" className="text-xs">간식</Badge>}
                    {!op.provides_lunch && !op.provides_snack && '-'}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

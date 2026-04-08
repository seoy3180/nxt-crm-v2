'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CLIENT_TYPES, BUSINESS_TYPES } from '@/lib/constants';
import type { ClientRow } from '@/lib/services/client-service';

interface ClientTreeTableProps {
  clients: ClientRow[];
  loading?: boolean;
}

export function ClientTreeTable({ clients, loading }: ClientTreeTableProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  // 부모-자식 그룹핑
  const parentMap = new Map<string, ClientRow[]>();
  const roots: ClientRow[] = [];

  clients.forEach((client) => {
    if (client.parent_id) {
      const children = parentMap.get(client.parent_id) ?? [];
      children.push(client);
      parentMap.set(client.parent_id, children);
    } else {
      roots.push(client);
    }
  });

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderRow(client: ClientRow, isChild = false): React.ReactNode {
    const children = parentMap.get(client.id) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(client.id);

    return (
      <React.Fragment key={client.id}>
        <TableRow
          className={cn(
            'h-12 cursor-pointer border-b border-zinc-100 transition-colors hover:bg-zinc-50',
            isChild && 'bg-zinc-50/50',
          )}
          onClick={() => router.push(`/clients/${client.id}`)}
        >
          <TableCell className={cn('px-4', isChild && 'pl-10')}>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(client.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </Button>
              )}
              <span className="font-medium">{client.name}</span>
              {hasChildren && (
                <Badge variant="secondary" className="text-xs">
                  상위
                </Badge>
              )}
            </div>
          </TableCell>
          <TableCell className="px-4">
            <div className="flex gap-1.5">
              {client.business_types?.map((bt: string) => {
                const colors: Record<string, string> = {
                  msp: 'bg-blue-100 text-blue-600',
                  tt: 'bg-amber-100 text-amber-700',
                  dev: 'bg-zinc-100 text-zinc-600',
                };
                return (
                  <span key={bt} className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${colors[bt] ?? 'bg-zinc-100 text-zinc-600'}`}>
                    {BUSINESS_TYPES[bt as keyof typeof BUSINESS_TYPES] ?? bt}
                  </span>
                );
              })}
            </div>
          </TableCell>
          <TableCell>
            {CLIENT_TYPES[client.client_type as keyof typeof CLIENT_TYPES] ?? client.client_type}
          </TableCell>
          <TableCell className="px-4">
            {client.grade ? (
              <span className="inline-block rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                {client.grade}
              </span>
            ) : '-'}
          </TableCell>
          <TableCell className="px-4">{client.contract_count ?? 0}</TableCell>
        </TableRow>
        {isExpanded &&
          children.map((child) => renderRow(child, true))}
      </React.Fragment>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <Table>
        <TableHeader>
          <TableRow className="bg-zinc-50">
            <TableHead className="h-11 w-[280px] px-4 text-[13px] font-medium text-zinc-500">고객명</TableHead>
            <TableHead className="h-11 w-[120px] px-4 text-[13px] font-medium text-zinc-500">비즈니스</TableHead>
            <TableHead className="h-11 w-[100px] px-4 text-[13px] font-medium text-zinc-500">유형</TableHead>
            <TableHead className="h-11 w-[60px] px-4 text-[13px] font-medium text-zinc-500">등급</TableHead>
            <TableHead className="h-11 w-[80px] px-4 text-[13px] font-medium text-zinc-500">계약 수</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roots.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                등록된 고객이 없습니다
              </TableCell>
            </TableRow>
          ) : (
            roots.map((client) => renderRow(client))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

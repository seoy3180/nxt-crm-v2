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
      <>
        <TableRow
          key={client.id}
          className="cursor-pointer hover:bg-accent/5"
          onClick={() => router.push(`/clients/${client.id}`)}
        >
          <TableCell className={isChild ? 'pl-10' : ''}>
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
          <TableCell>
            <div className="flex gap-1">
              {client.business_types?.map((bt: string) => (
                <Badge key={bt} variant="outline" className="text-xs">
                  {BUSINESS_TYPES[bt as keyof typeof BUSINESS_TYPES] ?? bt}
                </Badge>
              ))}
            </div>
          </TableCell>
          <TableCell>
            {CLIENT_TYPES[client.client_type as keyof typeof CLIENT_TYPES] ?? client.client_type}
          </TableCell>
          <TableCell>{client.grade ?? '-'}</TableCell>
          <TableCell>
            {(client as unknown as { profiles: { name: string } | null }).profiles?.name ?? '-'}
          </TableCell>
          <TableCell>{client.primary_contact_name ?? '-'}</TableCell>
          <TableCell>{client.contract_count ?? 0}</TableCell>
        </TableRow>
        {isExpanded &&
          children.map((child) => renderRow(child, true))}
      </>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[280px]">고객명</TableHead>
            <TableHead className="w-[120px]">비즈니스</TableHead>
            <TableHead className="w-[100px]">유형</TableHead>
            <TableHead className="w-[60px]">등급</TableHead>
            <TableHead className="w-[120px]">사내 담당자</TableHead>
            <TableHead className="w-[120px]">고객사 담당자</TableHead>
            <TableHead className="w-[80px]">계약 수</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roots.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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

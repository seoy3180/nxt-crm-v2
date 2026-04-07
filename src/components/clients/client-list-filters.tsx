'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CLIENT_TYPES, BUSINESS_TYPES } from '@/lib/constants';
import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

interface ClientListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  clientType: string | undefined;
  onClientTypeChange: (value: string | undefined) => void;
  businessType: string | undefined;
  onBusinessTypeChange: (value: string | undefined) => void;
}

export function ClientListFilters({
  search,
  onSearchChange,
  clientType,
  onClientTypeChange,
  businessType,
  onBusinessTypeChange,
}: ClientListFiltersProps) {
  return (
    <div className="flex items-center gap-3">
      <Select
        value={clientType ?? 'all'}
        onValueChange={(v) => onClientTypeChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="고객 유형" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 유형</SelectItem>
          {Object.entries(CLIENT_TYPES).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={businessType ?? 'all'}
        onValueChange={(v) => onBusinessTypeChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="비즈니스" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체</SelectItem>
          {Object.entries(BUSINESS_TYPES).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="고객명 검색..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Link href="/clients/new">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          고객 추가
        </Button>
      </Link>
    </div>
  );
}

'use client';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import { Search } from 'lucide-react';

interface ContractStageFilterProps {
  contractType: string;
  stage: string | undefined;
  onStageChange: (value: string | undefined) => void;
}

export function ContractStageFilter({ contractType, stage, onStageChange }: ContractStageFilterProps) {
  const stages = contractType === 'msp' ? MSP_STAGES : EDU_STAGES;

  return (
    <Select
      value={stage ?? 'all'}
      onValueChange={(v) => onStageChange(v === 'all' ? undefined : v)}
    >
      <SelectTrigger className="h-8 w-auto gap-1.5 rounded-md border-zinc-200 px-3 text-[13px]">
        <SelectValue placeholder="전체 단계" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">전체 단계</SelectItem>
        {stages.map((s) => (
          <SelectItem key={s.value} value={s.value}>
            {s.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface ContractSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
}

export function ContractSearch({ search, onSearchChange }: ContractSearchProps) {
  return (
    <div className="relative w-60">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
      <Input
        placeholder="계약명, 고객명 검색..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-8 rounded-md border-zinc-200 pl-9 text-[13px]"
      />
    </div>
  );
}

// 하위호환 유지
interface ContractFiltersProps {
  contractType: string;
  search: string;
  onSearchChange: (value: string) => void;
  stage: string | undefined;
  onStageChange: (value: string | undefined) => void;
}

export function ContractFilters({ contractType, search, onSearchChange, stage, onStageChange }: ContractFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      <ContractStageFilter contractType={contractType} stage={stage} onStageChange={onStageChange} />
      <ContractSearch search={search} onSearchChange={onSearchChange} />
    </div>
  );
}

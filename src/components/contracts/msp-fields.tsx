'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BILLING_LEVELS } from '@/lib/constants';

export function MspFields() {
  const [hasFee, setHasFee] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label>빌링 레벨</Label>
          <Select name="billingLevel">
            <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
            <SelectContent>
              {BILLING_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>{level}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>크레딧 쉐어 (%)</Label>
          <Input name="creditShare" inputMode="decimal" placeholder="0.00" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>예상 MRR (원)</Label>
          <Input name="expectedMrr" inputMode="numeric" placeholder="0" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label>결제자</Label>
          <Input name="payer" placeholder="결제자명" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>담당 영업</Label>
          <Input name="salesRep" placeholder="영업 담당자" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>AWS 금액 (원)</Label>
          <Input name="awsAmount" inputMode="numeric" placeholder="0" />
        </div>
      </div>

      <div className="w-1/3 space-y-1.5">
        <Label>관리비</Label>
        <input type="hidden" name="hasManagementFee" value={hasFee ? 'true' : 'false'} />
        <div className="flex h-10 rounded-md bg-zinc-100 p-1 gap-1">
          <button
            type="button"
            onClick={() => setHasFee(true)}
            className={`flex-1 rounded text-[13px] font-medium transition-colors ${
              hasFee
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                : 'text-zinc-400'
            }`}
          >
            있음
          </button>
          <button
            type="button"
            onClick={() => setHasFee(false)}
            className={`flex-1 rounded text-[13px] font-medium transition-colors ${
              !hasFee
                ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                : 'text-zinc-400'
            }`}
          >
            없음
          </button>
        </div>
      </div>
    </div>
  );
}

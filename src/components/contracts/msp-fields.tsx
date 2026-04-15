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
import { CREDIT_SHARE_OPTIONS, PAYER_OPTIONS, BILLING_METHOD_OPTIONS, MSP_GRADES } from '@/lib/constants';
import { useEmployees } from '@/hooks/use-employees';
import { EmployeeMultiSelect } from '@/components/common/employee-multi-select';

export function MspFields() {
  const [hasFee, setHasFee] = useState(false);
  const [billingOn, setBillingOn] = useState(false);
  const [techLeadIds, setTechLeadIds] = useState<string[]>([]);
  const { data: employees } = useEmployees();

  return (
    <div className="space-y-5">
      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label>MSP 등급</Label>
          <Select name="mspGrade">
            <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
            <SelectContent>
              {MSP_GRADES.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>크레딧 쉐어</Label>
          <Select name="creditShare">
            <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
            <SelectContent>
              {CREDIT_SHARE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>예상 MRR (원)</Label>
          <Input name="expectedMrr" inputMode="numeric" placeholder="0" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label>AWS 금액 (원)</Label>
          <Input name="awsAmount" inputMode="numeric" placeholder="0" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>AWS AM</Label>
          <Input name="awsAm" placeholder="AWS 담당자명" />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>AWS 계정 ID</Label>
          <Input name="awsAccountIds" placeholder="쉼표로 구분 (예: 123456, 789012)" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
          <Label>Payer</Label>
          <Select name="payer">
            <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
            <SelectContent>
              {PAYER_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>청구 방식</Label>
          <Select name="billingMethod">
            <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
            <SelectContent>
              {BILLING_METHOD_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 space-y-1.5">
          <Label>담당 영업</Label>
          <Select name="salesRepId">
            <SelectTrigger><SelectValue placeholder="선택" /></SelectTrigger>
            <SelectContent>
              {employees?.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>빌링온 별칭</Label>
        <Input name="billingOnAlias" placeholder="빌링온 계정 별칭 (예: 자일로시스템즈)" />
      </div>

      <div className="space-y-1.5">
        <Label>담당 기술 (다중 선택)</Label>
        <input type="hidden" name="techLeadIds" value={techLeadIds.join(',')} />
        <EmployeeMultiSelect
          selectedIds={techLeadIds}
          onChange={setTechLeadIds}
          placeholder="기술 담당자 선택"
        />
      </div>

      <div className="space-y-1.5">
        <Label>태그</Label>
        <Input name="tags" placeholder="쉼표로 구분 (예: 빠른결정, 기술중심)" />
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-1.5">
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
        <div className="flex-1 space-y-1.5">
          <Label>빌링온</Label>
          <input type="hidden" name="billingOn" value={billingOn ? 'true' : 'false'} />
          <div className="flex h-10 rounded-md bg-zinc-100 p-1 gap-1">
            <button
              type="button"
              onClick={() => setBillingOn(true)}
              className={`flex-1 rounded text-[13px] font-medium transition-colors ${
                billingOn
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                  : 'text-zinc-400'
              }`}
            >
              등록
            </button>
            <button
              type="button"
              onClick={() => setBillingOn(false)}
              className={`flex-1 rounded text-[13px] font-medium transition-colors ${
                !billingOn
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                  : 'text-zinc-400'
              }`}
            >
              미등록
            </button>
          </div>
        </div>
        <div className="flex-1" />
      </div>
    </div>
  );
}

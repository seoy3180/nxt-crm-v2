'use client';

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
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">MSP 상세</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
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
        <div className="space-y-2">
          <Label>크레딧 쉐어 (%)</Label>
          <Input name="creditShare" type="number" step="0.01" placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>예상 MRR (원)</Label>
          <Input name="expectedMrr" type="number" placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label>결제자</Label>
          <Input name="payer" placeholder="결제자명" />
        </div>
        <div className="space-y-2">
          <Label>담당 영업</Label>
          <Input name="salesRep" placeholder="영업 담당자" />
        </div>
        <div className="space-y-2">
          <Label>AWS 금액 (원)</Label>
          <Input name="awsAmount" type="number" placeholder="0" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Label>관리비 유무</Label>
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" name="hasManagementFee" value="true" /> 있음
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="radio" name="hasManagementFee" value="false" defaultChecked /> 없음
          </label>
        </div>
      </div>
    </div>
  );
}

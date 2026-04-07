'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import type { EduOperationInput } from '@/lib/validators/contract';

interface EduFieldsProps {
  operations: EduOperationInput[];
  onOperationsChange: (ops: EduOperationInput[]) => void;
}

const emptyOp: EduOperationInput = {
  operationName: '',
  location: null,
  targetOrg: null,
  startDate: null,
  endDate: null,
  totalHours: null,
  contractedCount: null,
  recruitedCount: null,
  actualCount: null,
  providesLunch: false,
  providesSnack: false,
};

export function EduFields({ operations, onOperationsChange }: EduFieldsProps) {
  function addOperation() {
    onOperationsChange([...operations, { ...emptyOp, operationName: `${operations.length + 1}차` }]);
  }

  function removeOperation(index: number) {
    onOperationsChange(operations.filter((_, i) => i !== index));
  }

  function updateOperation(index: number, field: string, value: unknown) {
    const updated = operations.map((op, i) => {
      if (i !== index) return op;
      return { ...op, [field]: value };
    });
    onOperationsChange(updated);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">교육 운영</h3>
        <Button type="button" variant="outline" size="sm" onClick={addOperation}>
          <Plus className="mr-1 h-3 w-3" />
          운영 추가
        </Button>
      </div>

      {operations.map((op, idx) => (
        <Card key={idx}>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-sm">운영 {idx + 1}</CardTitle>
            {operations.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeOperation(idx)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">운영명 *</Label>
                <Input
                  value={op.operationName}
                  onChange={(e) => updateOperation(idx, 'operationName', e.target.value)}
                  placeholder="운영명"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">교육 장소</Label>
                <Input
                  value={op.location ?? ''}
                  onChange={(e) => updateOperation(idx, 'location', e.target.value || null)}
                  placeholder="장소"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">시작일</Label>
                <Input
                  type="date"
                  value={op.startDate ?? ''}
                  onChange={(e) => updateOperation(idx, 'startDate', e.target.value || null)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">종료일</Label>
                <Input
                  type="date"
                  value={op.endDate ?? ''}
                  onChange={(e) => updateOperation(idx, 'endDate', e.target.value || null)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">계약 인원</Label>
                <Input
                  type="number"
                  value={op.contractedCount ?? ''}
                  onChange={(e) => updateOperation(idx, 'contractedCount', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">총 시간</Label>
                <Input
                  type="number"
                  value={op.totalHours ?? ''}
                  onChange={(e) => updateOperation(idx, 'totalHours', e.target.value ? Number(e.target.value) : null)}
                />
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={op.providesLunch}
                  onChange={(e) => updateOperation(idx, 'providesLunch', e.target.checked)}
                />
                {op.providesLunch ? '중식 제공' : '중식 미제공'}
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={op.providesSnack}
                  onChange={(e) => updateOperation(idx, 'providesSnack', e.target.checked)}
                />
                {op.providesSnack ? '간식 제공' : '간식 미제공'}
              </label>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

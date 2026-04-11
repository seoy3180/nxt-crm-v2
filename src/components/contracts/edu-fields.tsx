'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import type { EduOperationInput } from '@/lib/validators/contract';

interface EduFieldsProps {
  operations: EduOperationInput[];
  onOperationsChange: (ops: EduOperationInput[]) => void;
}

const emptyOp: EduOperationInput = {
  operationName: '',
  location: null,
  targetOrg: null,
  dates: [{ date: '', hours: 0 }],
  contractedCount: null,
  recruitedCount: null,
  actualCount: null,
  providesLunch: false,
  providesSnack: false,
};

const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

function getSummary(op: EduOperationInput) {
  const dates = op.dates ?? [];
  const totalHours = dates.reduce((sum, d) => sum + (d.hours ?? 0), 0);
  const parts: string[] = [];
  if (dates.length > 0) parts.push(`${dates.length}일`);
  if (totalHours > 0) parts.push(`${totalHours}h`);
  if (op.contractedCount) parts.push(`${op.contractedCount}명`);
  return parts.join(' · ') || '미입력';
}

export function EduFields({ operations, onOperationsChange }: EduFieldsProps) {
  const [expandedIdx, setExpandedIdx] = useState<number>(0);

  function addOperation() {
    const newOps = [...operations, { ...emptyOp, operationName: `${operations.length + 1}차` }];
    onOperationsChange(newOps);
    setExpandedIdx(newOps.length - 1);
  }

  function removeOperation(index: number) {
    onOperationsChange(operations.filter((_, i) => i !== index));
    if (expandedIdx >= index && expandedIdx > 0) setExpandedIdx(expandedIdx - 1);
  }

  function updateOperation(index: number, field: string, value: unknown) {
    const updated = operations.map((op, i) => {
      if (i !== index) return op;
      return { ...op, [field]: value };
    });
    onOperationsChange(updated);
  }

  function addEmptyDate(opIdx: number) {
    const op = operations[opIdx]!;
    const dates = op.dates ?? [];
    updateOperation(opIdx, 'dates', [...dates, { date: '', hours: 0 }]);
  }

  function setDate(opIdx: number, dateIdx: number, date: string) {
    const op = operations[opIdx]!;
    const dates = op.dates ?? [];
    if (date && dates.some((d, i) => i !== dateIdx && d.date === date)) return;
    const newDates = dates.map((d, i) => i === dateIdx ? { ...d, date } : d);
    if (date) newDates.sort((a, b) => a.date.localeCompare(b.date));
    updateOperation(opIdx, 'dates', newDates);
  }

  function removeDate(opIdx: number, dateIdx: number) {
    const op = operations[opIdx]!;
    updateOperation(opIdx, 'dates', (op.dates ?? []).filter((_, i) => i !== dateIdx));
  }

  function updateDateHours(opIdx: number, date: string, hours: number) {
    const op = operations[opIdx]!;
    const newDates = (op.dates ?? []).map((d) =>
      d.date === date ? { ...d, hours } : d,
    );
    updateOperation(opIdx, 'dates', newDates);
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

      <div className="space-y-2">
        {operations.map((op, idx) => {
          const isExpanded = expandedIdx === idx;
          const dates = op.dates ?? [];
          const totalHours = dates.reduce((sum, d) => sum + (d.hours ?? 0), 0);

          // 접힌 상태
          if (!isExpanded) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setExpandedIdx(idx)}
                className="flex h-12 w-full items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 text-left transition-colors hover:bg-zinc-50"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-zinc-400" />
                  <span className="text-[13px] font-medium text-zinc-900">
                    운영 {idx + 1}{op.operationName ? ` — ${op.operationName}` : ''}
                  </span>
                </div>
                <span className="text-xs text-zinc-400">{getSummary(op)}</span>
              </button>
            );
          }

          // 펼친 상태
          return (
            <div key={idx} className="overflow-hidden rounded-xl border border-blue-600">
              {/* 헤더 */}
              <div className="flex h-12 items-center justify-between bg-blue-50 px-4">
                <button
                  type="button"
                  onClick={() => setExpandedIdx(-1)}
                  className="flex items-center gap-2"
                >
                  <ChevronDown className="h-4 w-4 text-blue-600" />
                  <span className="text-[13px] font-semibold text-blue-600">운영 {idx + 1}</span>
                </button>
                {operations.length > 1 && (
                  <button type="button" onClick={() => removeOperation(idx)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                )}
              </div>

              {/* 본문 */}
              <div className="space-y-4 bg-white p-4">
                {/* 운영명 + 장소 */}
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
                </div>

                {/* 인원 */}
                <div className="space-y-1">
                  <Label className="text-xs">계약 인원</Label>
                  <Input
                    inputMode="numeric"
                    value={op.contractedCount ?? ''}
                    onChange={(e) => updateOperation(idx, 'contractedCount', e.target.value ? Number(e.target.value) : null)}
                    placeholder="인원 수"
                  />
                </div>

                {/* 중식 / 간식 세그먼트 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">중식</Label>
                    <div className="flex h-10 rounded-md bg-zinc-100 p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => updateOperation(idx, 'providesLunch', true)}
                        className={`flex-1 rounded text-[13px] font-medium transition-colors ${
                          op.providesLunch
                            ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                            : 'text-zinc-400'
                        }`}
                      >
                        제공
                      </button>
                      <button
                        type="button"
                        onClick={() => updateOperation(idx, 'providesLunch', false)}
                        className={`flex-1 rounded text-[13px] font-medium transition-colors ${
                          !op.providesLunch
                            ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                            : 'text-zinc-400'
                        }`}
                      >
                        미제공
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">간식</Label>
                    <div className="flex h-10 rounded-md bg-zinc-100 p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => updateOperation(idx, 'providesSnack', true)}
                        className={`flex-1 rounded text-[13px] font-medium transition-colors ${
                          op.providesSnack
                            ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                            : 'text-zinc-400'
                        }`}
                      >
                        제공
                      </button>
                      <button
                        type="button"
                        onClick={() => updateOperation(idx, 'providesSnack', false)}
                        className={`flex-1 rounded text-[13px] font-medium transition-colors ${
                          !op.providesSnack
                            ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                            : 'text-zinc-400'
                        }`}
                      >
                        미제공
                      </button>
                    </div>
                  </div>
                </div>

                {/* 교육 일자 — 3열 그리드 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">
                      교육 일자 ({dates.filter(d => d.date).length}일{totalHours > 0 ? ` · 총 ${totalHours}시간` : ''})
                    </Label>
                    <button
                      type="button"
                      onClick={() => addEmptyDate(idx)}
                      className="flex h-7 items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="h-3 w-3" />
                      일자 추가
                    </button>
                  </div>

                  {dates.length > 0 && (
                    <div className="space-y-1.5">
                      {dates.map((dateItem, dateIdx) => {
                        const d = dateItem.date ? new Date(dateItem.date + 'T00:00:00') : null;
                        const dayName = d ? dayNames[d.getDay()] : '';
                        return (
                          <div key={dateItem.date || `empty-${dateIdx}`} className="flex items-center gap-2">
                            <div className="flex h-8 shrink-0 items-center justify-center rounded-md bg-blue-50 px-2">
                              <span className="text-xs font-semibold text-blue-600">{dateIdx + 1}일차</span>
                            </div>
                            <div className="relative flex h-8 flex-1 items-center rounded-md border border-zinc-200">
                              <input
                                type="date"
                                className="h-full w-full rounded-md bg-transparent px-2.5 text-[13px] text-zinc-900 outline-none"
                                value={dateItem.date}
                                onChange={(e) => setDate(idx, dateIdx, e.target.value)}
                              />
                              {dateItem.date && (
                                <span className="pointer-events-none absolute right-2.5 text-xs text-zinc-400">{dayName}</span>
                              )}
                            </div>
                            <div className="flex h-8 w-[90px] items-center justify-center gap-1 rounded-md border border-zinc-200">
                              <input
                                inputMode="decimal"
                                className="w-10 bg-transparent text-center text-[13px] font-medium text-zinc-900 outline-none"
                                value={dateItem.hours || ''}
                                onChange={(e) => updateDateHours(idx, dateItem.date, e.target.value ? Number(e.target.value) : 0)}
                                placeholder="예: 2.5"
                              />
                              <span className="text-[11px] text-zinc-400">h</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDate(idx, dateIdx)}
                              className="text-zinc-400 hover:text-zinc-600"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-xs text-zinc-400">강사 배정은 계약 등록 후 운영 상세에서 관리할 수 있습니다.</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

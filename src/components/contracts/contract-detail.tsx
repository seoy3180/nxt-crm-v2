'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ContractInfoCard } from './contract-info-card';
import { MspDetailCard } from './msp-detail-card';
import { EduOperationsTable } from './edu-operations-table';
import { StageHistory } from './stage-history';
import { StageChangeDialog } from './stage-change-dialog';
import { ContractDeleteZone } from './contract-delete-zone';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import { contractService, type ContractRow } from '@/lib/services/contract-service';
import { safeNumber, getErrorMessage } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useEmployees } from '@/hooks/use-employees';
import { RevenueSplitCard } from './revenue-split-card';
import { ArrowLeft, ArrowRightLeft, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface ContractDetailProps {
  contract: ContractRow;
}

function getStageLabel(stage: string | null, type: string) {
  if (!stage) return '미지정';
  const stages = type === 'msp' ? MSP_STAGES : EDU_STAGES;
  return stages.find((s) => s.value === stage)?.label ?? stage;
}

export function ContractDetail({ contract }: ContractDetailProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();
  const { data: employees } = useEmployees();
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  function handleFieldChange(field: string, value: string) {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleCancel() {
    setEditValues({});
    setEditing(false);
  }

  async function handleSave() {
    if (Object.keys(editValues).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);

    try {
      // 계약 기본 정보 업데이트
      const contractUpdate: Record<string, unknown> = {};
      if ('totalAmount' in editValues) contractUpdate.totalAmount = safeNumber(editValues.totalAmount) ?? 0;
      if ('assignedTo' in editValues) contractUpdate.assignedTo = editValues.assignedTo || null;
      if ('description' in editValues) contractUpdate.description = editValues.description || null;

      if (Object.keys(contractUpdate).length > 0) {
        await contractService.update(contract.id, contractUpdate as Parameters<typeof contractService.update>[1]);
      }

      // MSP 상세 업데이트
      if (contract.type === 'msp') {
        const mspUpdate: Record<string, unknown> = {};
        if ('creditShare' in editValues) mspUpdate.creditShare = editValues.creditShare || null;
        if ('expectedMrr' in editValues) mspUpdate.expectedMrr = safeNumber(editValues.expectedMrr);
        if ('payer' in editValues) mspUpdate.payer = editValues.payer || null;
        if ('billingMethod' in editValues) mspUpdate.billingMethod = editValues.billingMethod || null;
        if ('salesRepId' in editValues) mspUpdate.salesRepId = editValues.salesRepId || null;
        if ('awsAmount' in editValues) mspUpdate.awsAmount = safeNumber(editValues.awsAmount);

        if (Object.keys(mspUpdate).length > 0) {
          await contractService.updateMspDetails(contract.id, mspUpdate as Parameters<typeof contractService.updateMspDetails>[1]);
        }
      }

      // 변경이력 기록
      if (currentUser) {
        const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];
        const fieldLabels: Record<string, string> = {
          totalAmount: '금액', assignedTo: '사내 담당자', description: '설명',
          creditShare: '크레딧 쉐어', expectedMrr: '예상 MRR', payer: 'Payer',
          billingMethod: '청구 방식', salesRepId: '영업 담당', awsAmount: 'AWS 금액',
        };

        for (const [key, newVal] of Object.entries(editValues)) {
          let oldVal: string | null = null;
          let displayOld: string | null = null;
          let displayNew: string | null = newVal || null;

          // 원본값 가져오기
          if (key === 'totalAmount') { oldVal = String(contract.total_amount); displayOld = `₩ ${Number(oldVal).toLocaleString()}`; displayNew = newVal ? `₩ ${Number(newVal).toLocaleString()}` : null; }
          else if (key === 'assignedTo') { oldVal = contract.assigned_to ?? null; }
          else if (key === 'description') { oldVal = contract.description ?? null; }
          else if (key === 'expectedMrr') { oldVal = String(contract.msp_details?.expected_mrr ?? ''); displayOld = oldVal ? `₩ ${Number(oldVal).toLocaleString()}` : null; displayNew = newVal ? `₩ ${Number(newVal).toLocaleString()}` : null; }
          else if (key === 'awsAmount') { oldVal = String(contract.msp_details?.aws_amount ?? ''); displayOld = oldVal ? `₩ ${Number(oldVal).toLocaleString()}` : null; displayNew = newVal ? `₩ ${Number(newVal).toLocaleString()}` : null; }
          else if (key === 'creditShare') { oldVal = contract.msp_details?.credit_share ?? null; displayOld = oldVal; }
          else if (key === 'payer') { oldVal = contract.msp_details?.payer ?? null; displayOld = oldVal; }
          else if (key === 'billingMethod') { oldVal = contract.msp_details?.billing_method ?? null; displayOld = oldVal; }
          else if (key === 'salesRepId') {
            oldVal = contract.msp_details?.sales_rep_id ?? null;
            displayOld = employees?.find((e) => e.id === oldVal)?.name ?? oldVal;
            displayNew = employees?.find((e) => e.id === newVal)?.name ?? displayNew;
          }

          if (String(oldVal ?? '') !== String(newVal ?? '')) {
            changes.push({
              field: fieldLabels[key] ?? key,
              oldValue: displayOld ?? oldVal,
              newValue: displayNew,
            });
          }
        }

        if (changes.length > 0) {
          await contractService.logChanges(contract.id, currentUser.id, changes).catch(() => {});
        }
      }

      queryClient.invalidateQueries({ queryKey: ['contract', contract.id] });
      queryClient.invalidateQueries({ queryKey: ['contract-history', contract.id] });
      toast.success('저장되었습니다');
      setEditValues({});
      setEditing(false);
    } catch (err) {
      toast.error(`저장 실패: ${getErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-zinc-900">{contract.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-zinc-400">{contract.contract_id}</span>
              <span className="inline-block rounded bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                {getStageLabel(contract.stage, contract.type)}
              </span>
              <span className="text-[13px] text-zinc-500">{contract.client_name ?? '-'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="h-9 rounded-lg border border-zinc-200 px-4 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="h-9 rounded-lg bg-blue-600 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-4 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                수정
              </button>
              <button
                type="button"
                onClick={() => setStageDialogOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-4 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                단계 변경
              </button>
            </>
          )}
        </div>
      </div>

      {/* 본문: 2열 */}
      <div className="flex flex-1 gap-6">
        <div className="flex-1 space-y-4">
          <ContractInfoCard
            contract={contract}
            editing={editing}
            editValues={editValues}
            onFieldChange={handleFieldChange}
          />
          {contract.type === 'msp' && (
            <MspDetailCard
              details={contract.msp_details ?? null}
              editing={editing}
              editValues={editValues}
              onFieldChange={handleFieldChange}
            />
          )}
          {contract.type === 'tt' && (
            <EduOperationsTable contractId={contract.id} />
          )}
        </div>
        <div className="w-[340px] space-y-4">
          {/* 매출 배분 */}
          <RevenueSplitCard contractId={contract.id} />
          {/* 변경 이력 */}
          <StageHistory contractId={contract.id} contractType={contract.type} />
        </div>
      </div>

      <div className="mt-auto">
        <ContractDeleteZone
          contractId={contract.id}
          contractName={contract.name}
          isSettled={contract.stage === 'settled'}
        />
      </div>

      <StageChangeDialog
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        contractId={contract.id}
        contractType={contract.type}
        currentStage={contract.stage}
      />
    </div>
  );
}

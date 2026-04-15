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
import { getErrorMessage, getStageColor } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useEmployees } from '@/hooks/use-employees';
import { RevenueSplitCard } from './revenue-split-card';
import { ArrowLeft, ArrowRightLeft, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { CONTRACT_FIELDS_BY_KEY, type FieldChangeContext } from '@/lib/contracts/field-definitions';

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
      // 1) editValues를 타겟별로 분류 (필드 정의 기반)
      const contractUpdate: Record<string, unknown> = {};
      const mspUpdate: Record<string, unknown> = {};
      let techLeadIds: string[] | undefined;

      for (const [key, raw] of Object.entries(editValues)) {
        const def = CONTRACT_FIELDS_BY_KEY.get(key);
        if (!def) continue;
        const parsed = def.parse(raw);
        if (def.target === 'contract') {
          contractUpdate[def.serviceKey] = parsed;
        } else if (def.target === 'msp_details') {
          mspUpdate[def.serviceKey] = parsed;
        } else if (def.target === 'tech_leads') {
          techLeadIds = parsed as string[];
        }
      }

      // 2) 타겟별 저장
      if (Object.keys(contractUpdate).length > 0) {
        await contractService.update(
          contract.id,
          contractUpdate as Parameters<typeof contractService.update>[1],
        );
      }
      if (contract.type === 'msp' && Object.keys(mspUpdate).length > 0) {
        await contractService.updateMspDetails(
          contract.id,
          mspUpdate as Parameters<typeof contractService.updateMspDetails>[1],
        );
      }
      if (contract.type === 'msp' && techLeadIds !== undefined) {
        await contractService.updateTechLeads(contract.id, techLeadIds);
      }

      // 3) 변경이력 기록 (필드 정의 기반 diff)
      if (currentUser) {
        const ctx: FieldChangeContext = { employees, contract };
        const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

        for (const [key, newRaw] of Object.entries(editValues)) {
          const def = CONTRACT_FIELDS_BY_KEY.get(key);
          if (!def) continue;

          const oldRaw = def.getOriginal(contract);
          const newVal = newRaw || null;

          // raw 값으로 변경 여부 비교
          if (String(oldRaw ?? '') === String(newVal ?? '')) continue;

          const displayOld = def.formatDisplay ? def.formatDisplay(oldRaw, ctx) : oldRaw;
          const displayNew = def.formatDisplay ? def.formatDisplay(newVal, ctx) : newVal;

          changes.push({
            field: def.label,
            oldValue: displayOld,
            newValue: displayNew,
          });
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
              <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-semibold ${getStageColor(contract.stage)}`}>
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
              techLeads={contract.tech_leads ?? []}
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

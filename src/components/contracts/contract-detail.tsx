'use client';

import { useRouter } from 'next/navigation';
import { ContractInfoCard } from './contract-info-card';
import { MspDetailCard } from './msp-detail-card';
import { EduOperationsTable } from './edu-operations-table';
import { StageHistory } from './stage-history';
import { ContractDeleteZone } from './contract-delete-zone';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import type { ContractRow } from '@/lib/services/contract-service';
import { ArrowLeft, Pencil } from 'lucide-react';

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
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-4 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          수정
        </button>
      </div>

      {/* 본문: 2열 */}
      <div className="flex flex-1 gap-6">
        <div className="flex-1 space-y-4">
          <ContractInfoCard contract={contract} />
          {contract.type === 'msp' && <MspDetailCard details={contract.msp_details ?? null} />}
          {contract.type === 'tt' && (
            <EduOperationsTable contractId={contract.id} />
          )}
        </div>
        <div className="w-[340px] space-y-4">
          {/* 매출 배분 */}
          <div className="rounded-xl border border-zinc-200 p-5 space-y-3">
            <h3 className="text-lg font-semibold text-zinc-900">매출 배분</h3>
            <p className="text-sm text-zinc-400">매출 배분 기능은 준비 중입니다</p>
          </div>
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
    </div>
  );
}

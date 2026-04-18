'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ContractInfoCard } from './contract-info-card';
import { MspDetailCard } from './msp-detail-card';
import { EduOperationsTable } from './edu-operations-table';
import { StageHistory } from './stage-history';
import { StageChangeDialog } from './stage-change-dialog';
import { ContractDeleteZone } from './contract-delete-zone';
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import type { ContractRow } from '@/lib/services/contract-service';
import { getStageColor } from '@/lib/utils';
import { RevenueSplitCard } from './revenue-split-card';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, ExternalLink } from 'lucide-react';
import { useSectionBasePath } from '@/hooks/use-section-base-path';

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
  const basePath = useSectionBasePath();
  const [stageDialogOpen, setStageDialogOpen] = useState(false);

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
          <button
            type="button"
            onClick={() => setStageDialogOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-4 text-[13px] font-medium text-zinc-500 transition-colors hover:bg-zinc-50"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            단계 변경
          </button>
          <ContractDeleteZone
            contractId={contract.id}
            contractName={contract.name}
            isSettled={contract.stage === 'settled'}
            inline
          />
        </div>
      </div>

      {/* 고객 서브카드 (#8) */}
      {contract.client_id && (
        <div className="flex items-center gap-4 rounded-lg bg-zinc-50 px-4 py-3 border border-zinc-100">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
            {(contract.client_name ?? '?')[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 truncate">{contract.client_name ?? '-'}</p>
            <p className="text-xs text-zinc-400 truncate">
              {contract.client_display_id ?? ''}{contract.contact_name ? ` · 담당자: ${contract.contact_name}` : ''}
            </p>
          </div>
          <Link
            href={`${basePath}/clients/${contract.client_id}`}
            className="flex shrink-0 items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-500 transition-colors hover:bg-zinc-100"
          >
            <ExternalLink className="h-3 w-3" />
            고객 상세
          </Link>
        </div>
      )}

      {/* 본문: 2열 */}
      <div className="flex flex-1 gap-6">
        <div className="flex-1 space-y-4">
          <ContractInfoCard contract={contract} />
          {contract.type === 'msp' && (
            <MspDetailCard
              contract={contract}
              details={contract.msp_details ?? null}
              techLeads={contract.tech_leads ?? []}
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

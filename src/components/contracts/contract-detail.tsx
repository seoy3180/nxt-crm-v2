'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContractInfoCard } from './contract-info-card';
import { MspDetailCard } from './msp-detail-card';
import { EduDetailCard } from './edu-detail-card';
import { EduOperationsTable } from './edu-operations-table';
import { StageHistory } from './stage-history';
import { StageChangeDialog } from './stage-change-dialog';
import { ContractDeleteZone } from './contract-delete-zone';
import { BUSINESS_TYPES, MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import type { ContractRow } from '@/lib/services/contract-service';
import { ArrowLeft, ArrowRightLeft } from 'lucide-react';

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
  const [stageDialogOpen, setStageDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-semibold text-zinc-900">{contract.name}</h1>
          <Badge variant="outline">{BUSINESS_TYPES[contract.type as keyof typeof BUSINESS_TYPES]}</Badge>
          <Badge variant="secondary">{getStageLabel(contract.stage, contract.type)}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStageDialogOpen(true)}>
            <ArrowRightLeft className="mr-1 h-3 w-3" />단계 변경
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <ContractInfoCard contract={contract} />
          {contract.type === 'msp' && <MspDetailCard details={contract.msp_details ?? null} />}
          {contract.type === 'tt' && (
            <>
              <EduDetailCard />
              <EduOperationsTable contractId={contract.id} />
            </>
          )}
        </div>
        <div className="w-[340px] space-y-4">
          <StageHistory contractId={contract.id} contractType={contract.type} />
        </div>
      </div>

      <ContractDeleteZone
        contractId={contract.id}
        contractName={contract.name}
        isSettled={contract.stage === 'settled'}
      />

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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatAmount } from '@/lib/utils';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { MSP_STAGES, EDU_STAGES, BUSINESS_TYPES } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { contractService, type ContractRow } from '@/lib/services/contract-service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ContractKanbanProps {
  contracts: ContractRow[];
  loading?: boolean;
  contractType: string;
}


function CardContent({ contract }: { contract: ContractRow }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-900">{contract.name}</p>
      <p className="text-xs text-zinc-500">{contract.client_name ?? '-'}</p>
      <span className="text-[13px] font-semibold text-blue-600">{formatAmount(contract.total_amount)}</span>
    </div>
  );
}

function DraggableCard({ contract, basePath }: { contract: ContractRow; basePath: string }) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: contract.id,
    data: { contract },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => router.push(`${basePath}/${contract.id}`)}
      className={`w-full cursor-grab rounded-lg border border-zinc-200 bg-white p-3.5 text-left transition-colors hover:border-zinc-300 active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      <CardContent contract={contract} />
    </div>
  );
}

function DroppableColumn({ stageValue, stageLabel, contracts, isOver, basePath }: {
  stageValue: string;
  stageLabel: string;
  contracts: ContractRow[];
  isOver: boolean;
  basePath: string;
}) {
  const { setNodeRef } = useDroppable({ id: stageValue });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-1 flex-col gap-3 rounded-xl p-3 transition-colors ${isOver ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-zinc-50'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-zinc-700">{stageLabel}</span>
        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
          {contracts.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {contracts.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-400">계약 없음</p>
        ) : (
          contracts.map((contract) => (
            <DraggableCard key={contract.id} contract={contract} basePath={basePath} />
          ))
        )}
      </div>
    </div>
  );
}

const BASE_PATHS: Record<string, string> = { msp: '/msp/contracts', tt: '/contracts', dev: '/contracts' };

export function ContractKanban({ contracts, loading, contractType }: ContractKanbanProps) {
  const basePath = BASE_PATHS[contractType] ?? '/contracts';
  const stages = contractType === 'msp' ? MSP_STAGES : contractType === 'tt' ? EDU_STAGES : MSP_STAGES;
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [activeContract, setActiveContract] = useState<ContractRow | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  if (loading) {
    return (
      <div className="flex flex-1 gap-4">
        {stages.map((s) => (
          <div key={s.value} className="flex-1 rounded-xl bg-zinc-50 p-3">
            <Skeleton className="mb-3 h-5 w-20" />
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 단계별 그룹핑
  const grouped = new Map<string, ContractRow[]>();
  stages.forEach((s) => grouped.set(s.value, []));
  contracts.forEach((c) => {
    const stageContracts = grouped.get(c.stage ?? '') ?? [];
    stageContracts.push(c);
    if (c.stage) grouped.set(c.stage, stageContracts);
  });

  function handleDragStart(event: DragStartEvent) {
    const contract = event.active.data.current?.contract as ContractRow;
    setActiveContract(contract);
  }

  function handleDragOver(event: DragOverEvent) {
    setOverColumn(event.over ? String(event.over.id) : null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveContract(null);
    setOverColumn(null);

    const { active, over } = event;
    if (!over || !currentUser) return;

    const contract = active.data.current?.contract as ContractRow;
    const newStage = String(over.id);

    if (contract.stage === newStage) return;

    try {
      await contractService.changeStage(
        contract.id,
        { toStage: newStage, note: null },
        currentUser.id,
      );
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      const stageLabel = stages.find((s) => s.value === newStage)?.label ?? newStage;
      toast.success(`"${contract.name}" → ${stageLabel}`);
    } catch (err) {
      const { getErrorMessage } = await import('@/lib/utils');
      toast.error(`단계 변경 실패: ${getErrorMessage(err)}`);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 gap-4">
        {stages.map((stage) => (
          <DroppableColumn
            key={stage.value}
            stageValue={stage.value}
            stageLabel={stage.label}
            contracts={grouped.get(stage.value) ?? []}
            isOver={overColumn === stage.value}
            basePath={basePath}
          />
        ))}
      </div>

      <DragOverlay>
        {activeContract && (
          <div className="w-64 rounded-lg border border-blue-200 bg-white p-3.5 shadow-lg">
            <CardContent contract={activeContract} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

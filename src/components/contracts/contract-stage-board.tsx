'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { GripVertical } from 'lucide-react';
import { formatAmount, getStageBoardColor } from '@/lib/utils';
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
import { MSP_STAGES, EDU_STAGES } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { contractService, type ContractRow } from '@/lib/services/contract-service';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSectionBasePath } from '@/hooks/use-section-base-path';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { invalidateContractStageQueries } from '@/lib/query-keys';

interface ContractStageBoardProps {
  contracts: ContractRow[];
  loading?: boolean;
  contractType: string;
  editMode: boolean;
}

function CardContent({ contract }: { contract: ContractRow }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-900">{contract.name}</p>
      <p className="text-xs text-zinc-500">{contract.client_name ?? '-'}</p>
      <span className="text-[13px] font-semibold text-blue-600">
        {formatAmount(contract.total_amount)}
      </span>
    </div>
  );
}

function DraggableCard({
  contract,
  basePath,
  editMode,
}: {
  contract: ContractRow;
  basePath: string;
  editMode: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: contract.id,
    data: { contract },
    disabled: !editMode,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => router.push(`${basePath}/${contract.id}`)}
      className={`flex w-full items-start gap-2 rounded-lg border bg-white p-3.5 text-left transition-colors ${editMode ? 'cursor-grab border-blue-300 shadow-sm active:cursor-grabbing hover:border-blue-400' : 'cursor-pointer border-zinc-200 hover:border-zinc-300'} ${isDragging ? 'opacity-30' : ''}`}
    >
      {editMode && <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />}
      <div className="flex-1">
        <CardContent contract={contract} />
      </div>
    </div>
  );
}

function DroppableColumn({
  stageValue,
  stageLabel,
  contracts,
  isOver,
  basePath,
  editMode,
}: {
  stageValue: string;
  stageLabel: string;
  contracts: ContractRow[];
  isOver: boolean;
  basePath: string;
  editMode: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: stageValue });
  const board = getStageBoardColor(stageValue);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-1 flex-col gap-3 rounded-xl p-3 transition-colors ${board.bg} ${isOver ? 'ring-2 ring-blue-300' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${board.dot}`} />
        <span className="text-[13px] font-semibold text-zinc-700">{stageLabel}</span>
        <span className="text-[13px] font-medium text-zinc-400">{contracts.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {contracts.length === 0 ? (
          <p className="py-8 text-center text-xs text-zinc-400">계약 없음</p>
        ) : (
          contracts.map((contract) => (
            <DraggableCard
              key={contract.id}
              contract={contract}
              basePath={basePath}
              editMode={editMode}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function ContractStageBoard({
  contracts,
  loading,
  contractType,
  editMode,
}: ContractStageBoardProps) {
  const sectionBase = useSectionBasePath();
  const basePath = `${sectionBase}/contracts`;
  const stages =
    contractType === 'msp' ? MSP_STAGES : contractType === 'edu' ? EDU_STAGES : MSP_STAGES;
  const { data: currentUser } = useCurrentUser();
  const queryClient = useQueryClient();
  const [activeContract, setActiveContract] = useState<ContractRow | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  // 로컬 상태로 optimistic update 관리
  const [localContracts, setLocalContracts] = useState(contracts);
  const prevContracts = useRef(contracts);
  useEffect(() => {
    // 서버 데이터가 변경되면 로컬 상태 동기화
    if (prevContracts.current !== contracts) {
      setLocalContracts(contracts);
      prevContracts.current = contracts;
    }
  }, [contracts]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

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

  // 단계별 그룹핑 (로컬 상태 기준)
  const grouped = new Map<string, ContractRow[]>();
  stages.forEach((s) => grouped.set(s.value, []));
  localContracts.forEach((c) => {
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

    const stageLabel = stages.find((s) => s.value === newStage)?.label ?? newStage;
    const oldStage = contract.stage;

    // Optimistic: 로컬 상태 즉시 업데이트
    setLocalContracts((prev) =>
      prev.map((c) => (c.id === contract.id ? { ...c, stage: newStage } : c)),
    );

    try {
      await contractService.changeStage(
        contract.id,
        { toStage: newStage, note: null },
        currentUser.id,
      );
      invalidateContractStageQueries(queryClient);
      toast.success(`"${contract.name}" → ${stageLabel}`);
    } catch (err) {
      // 실패 시 롤백
      setLocalContracts((prev) =>
        prev.map((c) => (c.id === contract.id ? { ...c, stage: oldStage } : c)),
      );
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
            editMode={editMode}
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

import type { MspStage } from '@/lib/constants';

const DEPOSIT_ENDED_STAGES: readonly MspStage[] = ['project_closed', 'unpaid'];

export function isEndedStage(stage: string | null): boolean {
  return stage !== null && (DEPOSIT_ENDED_STAGES as readonly string[]).includes(stage);
}

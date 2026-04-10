'use client';

import { formatAmount } from '@/lib/utils';
import { REVENUE_COLORS } from '@/lib/constants';

interface TeamRankingTableProps {
  teams: { teamName: string; revenue: number }[];
  unallocated: number;
}

const TEAM_COLOR_MAP: Record<string, string> = {
  MSP팀: REVENUE_COLORS.msp,
  교육팀: REVENUE_COLORS.tt,
  개발팀: REVENUE_COLORS.dev,
};

export function TeamRankingTable({ teams, unallocated }: TeamRankingTableProps) {
  const sorted = [...teams].sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="rounded-xl border border-zinc-200 p-5 h-full">
      <h3 className="text-base font-semibold mb-4">팀별 매출 순위</h3>
      <div className="flex flex-col gap-0">
        {sorted.map((team, idx) => (
          <div
            key={team.teamName}
            className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{
                  backgroundColor:
                    TEAM_COLOR_MAP[team.teamName] ?? REVENUE_COLORS.dev,
                }}
              >
                {idx + 1}
              </span>
              <span className="text-sm text-zinc-700">{team.teamName}</span>
            </div>
            <span className="text-sm font-bold text-zinc-900">
              {formatAmount(team.revenue)}
            </span>
          </div>
        ))}

        {unallocated > 0 && (
          <div className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0">
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-500">
                -
              </span>
              <span className="text-sm text-zinc-400">미배분</span>
            </div>
            <span className="text-sm font-bold text-zinc-400">
              {formatAmount(unallocated)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

// --- 월별 매출 ---

interface MonthlyRevenue {
  month: number; // 1-12
  msp: number;
  tt: number;
  dev: number;
  total: number;
}

export function useMonthlyRevenue(year: number, type?: 'msp' | 'tt' | 'dev') {
  return useQuery({
    queryKey: ['revenue-monthly', year, type ?? 'all'],
    queryFn: async () => {
      const supabase = createClient();

      const startDate = `${year}-01-01`;
      const endDate = `${year + 1}-01-01`;

      let query = supabase
        .from('contracts')
        .select('type, total_amount, created_at')
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .is('deleted_at', null);

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;

      // 1~12월 초기화
      const monthMap = new Map<number, { msp: number; tt: number; dev: number }>();
      for (let m = 1; m <= 12; m++) {
        monthMap.set(m, { msp: 0, tt: 0, dev: 0 });
      }

      (data ?? []).forEach((row) => {
        const month = new Date(row.created_at).getMonth() + 1; // 0-indexed → 1-indexed
        const amount = row.total_amount ?? 0;
        const entry = monthMap.get(month);
        if (!entry) return;

        const contractType = row.type as 'msp' | 'tt' | 'dev';
        if (contractType in entry) {
          entry[contractType] += amount;
        }
      });

      const result: MonthlyRevenue[] = [];
      for (let m = 1; m <= 12; m++) {
        const entry = monthMap.get(m)!;
        result.push({
          month: m,
          msp: entry.msp,
          tt: entry.tt,
          dev: entry.dev,
          total: entry.msp + entry.tt + entry.dev,
        });
      }

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// --- 팀별 매출 ---

interface TeamRevenue {
  teamId: string;
  teamName: string;
  revenue: number;
}

interface TeamRevenueResult {
  teams: TeamRevenue[]; // sorted desc by revenue
  unallocated: number; // contracts with no team allocation
}

export function useTeamRevenue(year: number, quarter?: 1 | 2 | 3 | 4) {
  return useQuery({
    queryKey: ['revenue-team', year, quarter ?? 'all'],
    queryFn: async () => {
      const supabase = createClient();

      // 날짜 범위 계산
      let startDate: string;
      let endDate: string;

      if (quarter) {
        const startMonth = (quarter - 1) * 3 + 1;
        const endMonth = startMonth + 3;
        startDate = `${year}-${String(startMonth).padStart(2, '0')}-01`;
        endDate = endMonth <= 12
          ? `${year}-${String(endMonth).padStart(2, '0')}-01`
          : `${year + 1}-01-01`;
      } else {
        startDate = `${year}-01-01`;
        endDate = `${year + 1}-01-01`;
      }

      // 1) contract_teams + contracts + teams 조인
      const { data: teamData, error: teamError } = await supabase
        .from('contract_teams')
        .select(
          'team_id, percentage, contracts!contract_teams_contract_id_fkey(id, total_amount, created_at, deleted_at), teams!contract_teams_team_id_fkey(id, name)'
        )
        .is('deleted_at', null);

      if (teamError) throw teamError;

      // 팀별 매출 집계
      const teamTotals = new Map<string, { name: string; revenue: number }>();
      const allocatedContractIds = new Set<string>();

      (teamData ?? []).forEach((row) => {
        const contract = row.contracts as {
          id: string;
          total_amount: number | null;
          created_at: string;
          deleted_at: string | null;
        } | null;

        if (!contract || contract.deleted_at) return;

        // 날짜 필터
        if (contract.created_at < startDate || contract.created_at >= endDate) return;

        const team = row.teams as { id: string; name: string } | null;
        if (!team) return;

        const amount = (contract.total_amount ?? 0) * ((row.percentage ?? 0) / 100);
        allocatedContractIds.add(contract.id);

        const existing = teamTotals.get(team.id);
        if (existing) {
          existing.revenue += amount;
        } else {
          teamTotals.set(team.id, { name: team.name, revenue: amount });
        }
      });

      // 2) 미배분 계약 조회
      const { data: allContracts, error: contractError } = await supabase
        .from('contracts')
        .select('id, total_amount')
        .gte('created_at', startDate)
        .lt('created_at', endDate)
        .is('deleted_at', null);

      if (contractError) throw contractError;

      let unallocated = 0;
      (allContracts ?? []).forEach((c) => {
        if (!allocatedContractIds.has(c.id)) {
          unallocated += c.total_amount ?? 0;
        }
      });

      // 팀 매출 정렬 (내림차순)
      const teams: TeamRevenue[] = Array.from(teamTotals.entries())
        .map(([teamId, { name, revenue }]) => ({
          teamId,
          teamName: name,
          revenue,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      return { teams, unallocated } as TeamRevenueResult;
    },
    staleTime: 5 * 60 * 1000,
  });
}

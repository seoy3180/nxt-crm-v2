'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

interface PipelineItem {
  stage: string;
  count: number;
}

interface RecentActivity {
  id: string;
  contractName: string;
  fromStage: string | null;
  toStage: string;
  changedBy: string;
  createdAt: string;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const supabase = createClient();
      const [clientsRes, mspRes, ttRes, devRes, revenueRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('type', 'msp').is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('type', 'tt').is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('type', 'dev').is('deleted_at', null),
        supabase.from('contracts').select('total_amount').is('deleted_at', null),
      ]);

      const totalRevenue = (revenueRes.data ?? []).reduce((sum, c) => sum + (c.total_amount ?? 0), 0);

      return {
        totalClients: clientsRes.count ?? 0,
        mspContracts: mspRes.count ?? 0,
        ttContracts: ttRes.count ?? 0,
        devContracts: devRes.count ?? 0,
        activeContracts: (mspRes.count ?? 0) + (ttRes.count ?? 0) + (devRes.count ?? 0),
        totalRevenue,
      };
    },
    staleTime: 30_000,
  });
}

export function usePipeline(type: 'msp' | 'tt') {
  return useQuery({
    queryKey: ['dashboard-pipeline', type],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('contracts')
        .select('stage')
        .eq('type', type)
        .is('deleted_at', null);

      const counts = new Map<string, number>();
      (data ?? []).forEach((c) => {
        const stage = c.stage ?? 'unknown';
        counts.set(stage, (counts.get(stage) ?? 0) + 1);
      });

      return Array.from(counts.entries()).map(([stage, count]) => ({
        stage,
        count,
      })) as PipelineItem[];
    },
    staleTime: 30_000,
  });
}

export function useMonthlyRevenue() {
  return useQuery({
    queryKey: ['dashboard-monthly-revenue'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('contracts')
        .select('total_amount, created_at')
        .is('deleted_at', null);

      const monthly = new Map<string, number>();
      (data ?? []).forEach((c) => {
        const month = c.created_at?.slice(0, 7) ?? 'unknown'; // YYYY-MM
        monthly.set(month, (monthly.get(month) ?? 0) + (c.total_amount ?? 0));
      });

      return Array.from(monthly.entries())
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => a.month.localeCompare(b.month));
    },
    staleTime: 30_000,
  });
}

export function useTeamRevenue() {
  return useQuery({
    queryKey: ['dashboard-team-revenue'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('contract_teams')
        .select('team_id, percentage, contracts!contract_teams_contract_id_fkey(total_amount), teams!contract_teams_team_id_fkey(name)')
        .is('deleted_at', null);

      const teamTotals = new Map<string, number>();
      (data ?? []).forEach((row) => {
        const teamName = (row.teams as { name: string } | null)?.name ?? '미지정';
        const amount = (row.contracts as { total_amount: number } | null)?.total_amount ?? 0;
        const share = amount * ((row.percentage ?? 0) / 100);
        teamTotals.set(teamName, (teamTotals.get(teamName) ?? 0) + share);
      });

      return Array.from(teamTotals.entries())
        .map(([team, amount]) => ({ team, amount }))
        .sort((a, b) => b.amount - a.amount);
    },
    staleTime: 30_000,
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard-recent-activity'],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contract_history')
        .select('id, from_stage, to_stage, created_at, contract_id, contracts!contract_history_contract_id_fkey(name), profiles!contract_history_changed_by_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        contractName: (row.contracts as { name: string } | null)?.name ?? '-',
        fromStage: row.from_stage,
        toStage: row.to_stage,
        changedBy: (row.profiles as { name: string } | null)?.name ?? '-',
        createdAt: row.created_at,
      })) as RecentActivity[];
    },
    staleTime: 30_000,
  });
}

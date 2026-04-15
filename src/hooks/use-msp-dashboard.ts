'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export function useMspStats() {
  return useQuery({
    queryKey: ['msp-dashboard-stats'],
    queryFn: async () => {
      const supabase = createClient();
      const [clientsRes, contractsRes, revenueRes] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }).contains('business_types', ['msp']).is('deleted_at', null),
        supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('type', 'msp').is('deleted_at', null),
        supabase.from('contracts').select('total_amount').eq('type', 'msp').is('deleted_at', null),
      ]);
      const totalRevenue = (revenueRes.data ?? []).reduce((s, c) => s + (c.total_amount ?? 0), 0);
      return { clients: clientsRes.count ?? 0, contracts: contractsRes.count ?? 0, revenue: totalRevenue };
    },
    staleTime: 30_000,
  });
}

export function useMspGradeDistribution() {
  return useQuery({
    queryKey: ['msp-grade-distribution'],
    queryFn: async () => {
      const supabase = createClient();
      // 계약 기준 등급 분포 (삭제되지 않은 MSP 계약)
      const { data } = await supabase
        .from('contract_msp_details')
        .select('msp_grade, contracts!contract_msp_details_contract_id_fkey(type, deleted_at)');
      const counts = new Map<string, number>();
      (data ?? []).forEach((row) => {
        const contract = row.contracts as { type: string; deleted_at: string | null } | null;
        if (!contract || contract.deleted_at || contract.type !== 'msp') return;
        const grade = row.msp_grade ?? '미지정';
        counts.set(grade, (counts.get(grade) ?? 0) + 1);
      });
      return Array.from(counts.entries()).map(([grade, count]) => ({ grade, count }));
    },
    staleTime: 30_000,
  });
}

export function useMspPipeline() {
  return useQuery({
    queryKey: ['msp-dashboard-pipeline'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from('contracts').select('stage').eq('type', 'msp').is('deleted_at', null);
      const counts = new Map<string, number>();
      (data ?? []).forEach((c) => counts.set(c.stage ?? '', (counts.get(c.stage ?? '') ?? 0) + 1));
      return Array.from(counts.entries()).map(([stage, count]) => ({ stage, count }));
    },
    staleTime: 30_000,
  });
}

export function useMspMonthlyRevenue() {
  return useQuery({
    queryKey: ['msp-monthly-revenue'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from('contracts').select('total_amount, created_at').eq('type', 'msp').is('deleted_at', null);
      const monthly = new Map<string, number>();
      (data ?? []).forEach((c) => {
        const month = c.created_at?.slice(0, 7) ?? 'unknown';
        monthly.set(month, (monthly.get(month) ?? 0) + (c.total_amount ?? 0));
      });
      return Array.from(monthly.entries()).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month));
    },
    staleTime: 30_000,
  });
}

export function useMspRecentActivity() {
  return useQuery({
    queryKey: ['msp-dashboard-activity'],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('contract_history')
        .select('id, from_stage, to_stage, created_at, contracts!inner(name, type), profiles!contract_history_changed_by_fkey(name)')
        .eq('contracts.type', 'msp')
        .order('created_at', { ascending: false })
        .limit(10);
      return (data ?? []).map((r) => ({
        id: r.id,
        contractName: (r.contracts as unknown as { name: string })?.name ?? '-',
        fromStage: r.from_stage,
        toStage: r.to_stage,
        changedBy: (r.profiles as { name: string } | null)?.name ?? '-',
        createdAt: r.created_at,
      }));
    },
    staleTime: 30_000,
  });
}

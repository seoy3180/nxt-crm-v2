'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export interface EmployeeOption {
  id: string;
  name: string;
  position: string | null;
  teamId: string | null;
}

export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<EmployeeOption[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, position, team_id')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((e) => ({
        id: e.id,
        name: e.name,
        position: e.position,
        teamId: e.team_id,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

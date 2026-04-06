'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthContext } from '@/providers/auth-provider';
import type { UserRole, TeamType } from '@/lib/constants';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamId: string | null;
  teamType: TeamType | null;
  position: string | null;
}

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  role: string;
  team_id: string | null;
  position: string | null;
  teams: { type: string } | null;
}

export function useCurrentUser() {
  const { user } = useAuthContext();
  const supabase = createClient();

  return useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async (): Promise<CurrentUser> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, teams(type)')
        .eq('id', user!.id)
        .single();

      if (error) throw error;

      const row = data as unknown as ProfileRow;

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as UserRole,
        teamId: row.team_id,
        teamType: (row.teams?.type ?? null) as TeamType | null,
        position: row.position,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

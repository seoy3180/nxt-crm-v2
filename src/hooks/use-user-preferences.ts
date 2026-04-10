'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuthContext } from '@/providers/auth-provider';
import type { Json } from '@/lib/supabase/types';

type Preferences = Record<string, unknown>;

export function useUserPreferences() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async (): Promise<Preferences> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return (data?.preferences as Preferences) ?? {};
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (patch: Preferences) => {
      const supabase = createClient();
      const current = query.data ?? {};
      const merged = { ...current, ...patch };

      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: user!.id, preferences: merged as unknown as Json, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
      return merged;
    },
    onSuccess: (merged) => {
      queryClient.setQueryData(['user-preferences', user?.id], merged);
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    updatePreferences: mutation.mutate,
  };
}

/** 컬럼 설정을 user_preferences에서 읽고/쓰는 훅. 로딩 완료 후 서버값으로 동기화. */
export function useColumnPreference(key: string, defaultColumns: string[]) {
  const { preferences, isSuccess, updatePreferences } = useUserPreferences();
  const [columns, setColumns] = useState<string[]>(defaultColumns);
  const [synced, setSynced] = useState(false);

  // 서버에서 가져온 후 한 번만 동기화
  useEffect(() => {
    if (isSuccess && !synced) {
      const saved = preferences?.[key] as string[] | undefined;
      if (saved && saved.length > 0) {
        setColumns(saved);
      }
      setSynced(true);
    }
  }, [isSuccess, synced, preferences, key]);

  const saveColumns = useCallback((cols: string[]) => {
    setColumns(cols);
    updatePreferences({ [key]: cols });
  }, [key, updatePreferences]);

  return { columns, saveColumns, isReady: synced };
}

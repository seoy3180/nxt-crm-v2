'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import { getDefaultLanding } from '@/lib/auth/permissions';

export default function Home() {
  const router = useRouter();
  const { data: currentUser, isLoading } = useCurrentUser();

  useEffect(() => {
    if (isLoading) return;
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    router.replace(getDefaultLanding(currentUser.role, currentUser.teamType));
  }, [router, currentUser, isLoading]);

  return null;
}

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

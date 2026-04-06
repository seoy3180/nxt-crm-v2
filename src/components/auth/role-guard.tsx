'use client';

import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { UserRole } from '@/lib/constants';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { data: currentUser, isLoading } = useCurrentUser();
  const router = useRouter();

  if (isLoading) return null;

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    if (fallback) return <>{fallback}</>;
    router.push('/dashboard');
    return null;
  }

  return <>{children}</>;
}

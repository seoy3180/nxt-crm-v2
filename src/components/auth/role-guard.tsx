'use client';

import { useCurrentUser } from '@/hooks/use-current-user';
import type { UserRole } from '@/lib/constants';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 클라이언트 단 페이지/영역 가드.
 * 실제 데이터 보호는 RLS가 담당하므로 본 가드는 UI 진입 차단 + 안내 용도.
 * fallback이 없으면 기본 "접근 권한 없음" 메시지 노출 (자동 redirect 안 함 — 무한 루프 방지).
 */
export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { data: currentUser, isLoading } = useCurrentUser();

  if (isLoading) return null;

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center max-w-md">
          <p className="text-base font-semibold text-zinc-900">접근 권한이 없습니다</p>
          <p className="mt-2 text-sm text-zinc-500">이 페이지는 admin·c_level만 이용할 수 있습니다.</p>
          <p className="mt-1 text-xs text-zinc-400">좌측 사이드바에서 본인 영역으로 이동하세요.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

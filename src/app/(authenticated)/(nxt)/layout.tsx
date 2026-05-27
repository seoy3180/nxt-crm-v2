'use client';

import { RoleGuard } from '@/components/auth/role-guard';

/**
 * NXT 영역(전사 통합) 가드 — admin·c_level만 진입 허용.
 * URL은 그대로 (/dashboard, /clients, /contracts, /revenue) — route group이라 폴더만 묶음.
 */
export default function NxtLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['admin', 'c_level']}>{children}</RoleGuard>;
}

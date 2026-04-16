'use client';

import { usePathname } from 'next/navigation';

/**
 * 현재 URL 경로에서 섹션 접두사를 감지하여 basePath를 반환.
 *
 * - `/msp/*` 경로 → `/msp`
 * - 그 외 (/clients, /contracts 등 전사) → `''` (빈 문자열)
 *
 * 섹션 간 컨텍스트 유지가 필요한 컴포넌트(양쪽에서 재사용되는 탭/폼/리스트)에서 사용.
 *
 * 예:
 *   const basePath = useSectionBasePath();
 *   // /msp/clients/123 에서: basePath === '/msp'
 *   // /clients/123 에서: basePath === ''
 *   router.push(`${basePath}/clients/${id}`)
 */
export function useSectionBasePath(): string {
  const pathname = usePathname();
  if (pathname.startsWith('/msp/') || pathname === '/msp') return '/msp';
  // 추후 /edu, /dev 섹션 활성화 시 여기에 추가
  return '';
}

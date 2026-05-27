import { TEAM_BUSINESS_DOMAINS, type UserRole, type TeamType, type BusinessDomain } from '@/lib/constants';

// 사이드바 섹션 키 = 비즈니스 도메인 (nxt는 전사 전용)
type SectionKey = 'nxt' | BusinessDomain;

/**
 * 섹션 접근 판정.
 * - admin·c_level: 전체
 * - nxt: 전사 전용 (admin·c_level만)
 * - msp/edu/dev: 사용자 팀이 해당 비즈니스 도메인을 담당하면 허용 (M:N 매핑)
 */
export function canAccessSection(
  section: SectionKey,
  role: UserRole,
  teamType: TeamType,
): boolean {
  if (role === 'admin' || role === 'c_level') return true;
  if (section === 'nxt') return false;
  return TEAM_BUSINESS_DOMAINS[teamType]?.includes(section) ?? false;
}

type Feature =
  | 'revenue_all'
  | 'revenue_team'
  | 'user_management'
  | 'nxt_dashboard';

const FEATURE_ACCESS: Record<Feature, UserRole[]> = {
  revenue_all: ['admin', 'c_level'],
  // 매출 분석은 NXT 섹션 전용 → team_lead는 진입 불가 (섹션 가드와 일관성)
  revenue_team: ['admin', 'c_level'],
  user_management: ['admin'],
  nxt_dashboard: ['admin', 'c_level'],
};

export function canAccessFeature(feature: Feature, role: UserRole): boolean {
  return FEATURE_ACCESS[feature]?.includes(role) ?? false;
}

/**
 * 고객 수정·삭제·연락처 관리 권한 판정 (DB can_access_client과 동일 로직).
 * - admin·c_level: 전체
 * - 그 외: 사용자 팀 담당 도메인이 고객 business_types와 하나라도 겹치면 허용
 * 조회(목록/상세)는 전사 허용이므로 여기서 판정하지 않는다.
 */
export function canManageClient(
  role: UserRole,
  teamType: TeamType | null,
  clientBusinessTypes: readonly string[] | null | undefined,
): boolean {
  if (role === 'admin' || role === 'c_level') return true;
  if (!teamType) return false;
  const domains = TEAM_BUSINESS_DOMAINS[teamType] ?? [];
  const bts = clientBusinessTypes ?? [];
  return domains.some((d) => bts.includes(d));
}

// 비즈니스 도메인 → 사이드바 섹션 첫 경로
const DOMAIN_LANDING: Record<BusinessDomain, string> = {
  msp: '/msp',
  edu: '/edu',
  dev: '/dev',
};

/**
 * 로그인 후 기본 랜딩 경로.
 * - admin·c_level: NXT 대시보드(/dashboard)
 * - 그 외: 본인 팀 담당 도메인의 첫 섹션 (msp 우선 → edu → dev)
 * - 소속/매핑 없으면 /dashboard (RoleGuard가 안내 화면 처리)
 */
export function getDefaultLanding(role: UserRole, teamType: TeamType | null): string {
  if (role === 'admin' || role === 'c_level') return '/dashboard';
  if (!teamType) return '/dashboard';
  const domains = TEAM_BUSINESS_DOMAINS[teamType] ?? [];
  for (const d of ['msp', 'edu', 'dev'] as const) {
    if (domains.includes(d)) return DOMAIN_LANDING[d];
  }
  return '/dashboard';
}

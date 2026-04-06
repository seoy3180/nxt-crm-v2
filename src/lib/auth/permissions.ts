import type { UserRole, TeamType } from '@/lib/constants';

type SectionKey = 'nxt' | 'msp' | 'edu' | 'dev';

const SECTION_TEAM_MAP: Record<string, TeamType> = {
  msp: 'msp',
  edu: 'education',
  dev: 'dev',
};

export function canAccessSection(
  section: SectionKey,
  role: UserRole,
  teamType: TeamType,
): boolean {
  if (role === 'admin' || role === 'c_level') return true;
  if (section === 'nxt') return false;
  const requiredTeam = SECTION_TEAM_MAP[section];
  return requiredTeam === teamType;
}

type Feature =
  | 'revenue_all'
  | 'revenue_team'
  | 'user_management'
  | 'nxt_dashboard';

const FEATURE_ACCESS: Record<Feature, UserRole[]> = {
  revenue_all: ['admin', 'c_level'],
  revenue_team: ['team_lead', 'admin', 'c_level'],
  user_management: ['admin'],
  nxt_dashboard: ['admin', 'c_level'],
};

export function canAccessFeature(feature: Feature, role: UserRole): boolean {
  return FEATURE_ACCESS[feature]?.includes(role) ?? false;
}

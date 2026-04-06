// 사용자 역할
export const USER_ROLES = ['staff', 'team_lead', 'admin', 'c_level'] as const;
export type UserRole = (typeof USER_ROLES)[number];

// 팀 타입
export const TEAM_TYPES = ['msp', 'education', 'dev'] as const;
export type TeamType = (typeof TEAM_TYPES)[number];

// 고객 유형
export const CLIENT_TYPES = {
  univ: '대학교',
  corp: '기업',
  govt: '공공기관',
  asso: '협회',
  etc: '기타',
} as const;
export type ClientType = keyof typeof CLIENT_TYPES;

// 고객 통합 등급
export const CLIENT_GRADES = ['A', 'B', 'C', 'D', 'E'] as const;
export type ClientGrade = (typeof CLIENT_GRADES)[number];

// MSP 등급
export const MSP_GRADES = ['None', 'FREE', 'MSP10', 'MSP15', 'MSP20', 'ETC'] as const;
export type MspGrade = (typeof MSP_GRADES)[number];

// 비즈니스 타입
export const BUSINESS_TYPES = {
  msp: 'MSP',
  tt: '교육',
  dev: '개발',
} as const;
export type BusinessType = keyof typeof BUSINESS_TYPES;

// MSP 계약 단계 (4단계)
export const MSP_STAGES = [
  { value: 'pre_contract', label: '계약전' },
  { value: 'contracted', label: '계약완료' },
  { value: 'completed', label: '사업완료' },
  { value: 'settled', label: '정산' },
] as const;
export type MspStage = (typeof MSP_STAGES)[number]['value'];

// 교육 계약 단계 (5단계)
export const EDU_STAGES = [
  { value: 'proposal', label: '제안' },
  { value: 'contracted', label: '계약완료' },
  { value: 'operating', label: '운영중' },
  { value: 'op_completed', label: '운영완료' },
  { value: 'settled', label: '정산' },
] as const;
export type EduStage = (typeof EDU_STAGES)[number]['value'];

// 통화
export const CURRENCIES = ['KRW', 'USD'] as const;
export type Currency = (typeof CURRENCIES)[number];

// 강사 역할
export const INSTRUCTOR_ROLES = ['주강사', '보조강사', '멘토', '게스트'] as const;
export type InstructorRole = (typeof INSTRUCTOR_ROLES)[number];

// 사이드바 섹션 정의
export const SIDEBAR_SECTIONS = [
  {
    key: 'nxt',
    label: 'NXT',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    items: [
      { href: '/dashboard', label: '대시보드', icon: 'layout-dashboard' },
      { href: '/clients', label: '고객 관리', icon: 'building-2' },
      { href: '/contracts', label: '계약 관리', icon: 'file-text' },
      { href: '/revenue', label: '매출 분석', icon: 'trending-up' },
    ],
  },
  {
    key: 'msp',
    label: 'MSP',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    allowedTeams: ['msp'] as TeamType[],
    items: [
      { href: '/msp', label: '대시보드', icon: 'layout-dashboard' },
      { href: '/msp/clients', label: '고객', icon: 'building-2' },
      { href: '/msp/contracts', label: '계약', icon: 'file-text' },
      { href: '/msp/contacts', label: '연락처', icon: 'contact' },
    ],
  },
  {
    key: 'edu',
    label: 'EDU',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    allowedTeams: ['education'] as TeamType[],
    items: [
      { href: '/edu', label: '대시보드', icon: 'layout-dashboard' },
      { href: '/edu/clients', label: '고객', icon: 'building-2' },
      { href: '/edu/contracts', label: '계약', icon: 'file-text' },
    ],
  },
  {
    key: 'dev',
    label: 'DEV',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    allowedTeams: ['dev'] as TeamType[],
    items: [
      { href: '/dev', label: '대시보드', icon: 'layout-dashboard' },
    ],
  },
] as const;

// 페이지네이션
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// 디바운스
export const SEARCH_DEBOUNCE_MS = 300;

// 빌링 레벨 옵션 (MSP 계약)
export const BILLING_LEVELS = [
  'MSP1', 'MSP5', 'MSP10', 'MSP15', 'MSP20',
  'MSP25', 'MSP30', 'MSP50', 'MSP100',
] as const;
export type BillingLevel = (typeof BILLING_LEVELS)[number];

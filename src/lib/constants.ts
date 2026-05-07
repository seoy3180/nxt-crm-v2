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
  { value: 'pre_contract', label: '계약 전' },
  { value: 'billing_complete', label: '빌링 완료' },
  { value: 'project_closed', label: '프로젝트 종료' },
  { value: 'unpaid', label: '미납/해지' },
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
      { href: '/dashboard', label: '대시보드', icon: 'layout-dashboard', roles: ['admin', 'c_level'] as UserRole[] },
      { href: '/clients', label: '고객 관리', icon: 'users', roles: ['admin', 'c_level'] as UserRole[] },
      { href: '/contracts', label: '계약 관리', icon: 'file-text', roles: ['admin', 'c_level'] as UserRole[] },
      { href: '/revenue', label: '매출 분석', icon: 'trending-up', roles: ['team_lead', 'admin', 'c_level'] as UserRole[] },
    ],
  },
  {
    key: 'msp',
    label: 'MSP',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    allowedTeams: ['msp'] as TeamType[],
    items: [
      { href: '/msp', label: 'MSP 대시보드', icon: 'activity' },
      { href: '/msp/clients', label: 'MSP 고객', icon: 'building' },
      { href: '/msp/contracts', label: 'MSP 계약', icon: 'cloud' },
      { href: '/msp/contacts', label: 'MSP 연락처', icon: 'contact' },
    ],
  },
  {
    key: 'edu',
    label: 'EDU',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    allowedTeams: ['education'] as TeamType[],
    items: [
      { href: '/edu', label: '교육 대시보드', icon: 'layout-dashboard' },
      { href: '/edu/contracts', label: '교육 계약', icon: 'graduation-cap' },
      { href: '/edu/operations', label: '교육 운영', icon: 'calendar' },
    ],
  },
  {
    key: 'dev',
    label: 'DEV',
    allowedRoles: ['admin', 'c_level'] as UserRole[],
    allowedTeams: ['dev'] as TeamType[],
    items: [
      { href: '/dev', label: '준비 중...', icon: 'code', disabled: true },
    ],
  },
] as const;

// 페이지네이션
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// 디바운스
export const SEARCH_DEBOUNCE_MS = 300;

// 고객 상태
export const CLIENT_STATUS_OPTIONS = ['신규', '진행중', '활성', '휴면', '종료', '상태없음'] as const;
export type ClientStatus = (typeof CLIENT_STATUS_OPTIONS)[number];

// MSP 고객 enum 옵션
export const INDUSTRY_OPTIONS = ['IT', '제조', '금융', '유통', '공공', '서울대 연구실', '기타'] as const;
export const COMPANY_SIZE_OPTIONS = ['스타트업', '중소기업', '중견기업', '대기업', '공공기관'] as const;

// MSP 계약 enum 옵션
export const CREDIT_SHARE_OPTIONS = ['가능', '불가능', '미정'] as const;
export const CREDIT_SHARE_COLORS: Record<string, string> = {
  '가능': 'bg-emerald-100 text-emerald-600',
  '불가능': 'bg-red-100 text-red-600',
  '미정': 'bg-zinc-100 text-zinc-500',
};
export const PAYER_OPTIONS = ['ETV-AWS-13', 'ETV-AWS-14', 'Org-001', 'Billing Transfer'] as const;
export const BILLING_METHOD_OPTIONS = ['대표님 직접 청구', '매월 10일 세금계산서 발행', '공공기관 별도 청구'] as const;
export const AWS_AM_OPTIONS = ['이가현', 'Albert Park', '고의준', '김은서', '김병준', '변지혜', '오진택', '방승훈', '민재기', '이영은'] as const;
export const AWS_AM_COLORS: Record<string, string> = {
  '이가현': 'bg-rose-100 text-rose-700',
  'Albert Park': 'bg-orange-100 text-orange-700',
  '고의준': 'bg-amber-100 text-amber-700',
  '김은서': 'bg-lime-100 text-lime-700',
  '김병준': 'bg-indigo-100 text-indigo-700',
  '변지혜': 'bg-fuchsia-100 text-fuchsia-700',
  '오진택': 'bg-cyan-100 text-cyan-700',
  '방승훈': 'bg-teal-100 text-teal-700',
  '민재기': 'bg-violet-100 text-violet-700',
  '이영은': 'bg-pink-100 text-pink-700',
};
export const MSP_TAG_OPTIONS = ['디자인중시', '빠른결정', '가격민감', '기술중심'] as const;
export const MSP_TAG_COLORS: Record<string, string> = {
  '디자인중시': 'bg-pink-100 text-pink-600',
  '빠른결정': 'bg-amber-100 text-amber-600',
  '가격민감': 'bg-emerald-100 text-emerald-600',
  '기술중심': 'bg-blue-100 text-blue-600',
};

// 매출 분석 색상
export const REVENUE_COLORS = {
  msp: '#2563eb',
  tt: '#f59e0b',
  dev: '#71717a',
  unallocated: '#e4e4e7',
} as const;

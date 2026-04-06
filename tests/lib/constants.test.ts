// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  USER_ROLES,
  TEAM_TYPES,
  CLIENT_TYPES,
  CLIENT_GRADES,
  BUSINESS_TYPES,
  MSP_STAGES,
  EDU_STAGES,
  MSP_GRADES,
  SIDEBAR_SECTIONS,
} from '@/lib/constants';

describe('constants', () => {
  it('USER_ROLES에 4개 역할이 정의되어야 한다', () => {
    expect(USER_ROLES).toEqual(['staff', 'team_lead', 'admin', 'c_level']);
  });

  it('TEAM_TYPES에 3개 팀이 정의되어야 한다', () => {
    expect(TEAM_TYPES).toEqual(['msp', 'education', 'dev']);
  });

  it('CLIENT_TYPES에 5개 유형이 정의되어야 한다', () => {
    expect(Object.keys(CLIENT_TYPES)).toHaveLength(5);
    expect(CLIENT_TYPES.univ).toBe('대학교');
    expect(CLIENT_TYPES.govt).toBe('공공기관');
  });

  it('CLIENT_GRADES에 5개 등급이 정의되어야 한다', () => {
    expect(CLIENT_GRADES).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('MSP_GRADES에 6개 등급이 정의되어야 한다', () => {
    expect(MSP_GRADES).toEqual(['None', 'FREE', 'MSP10', 'MSP15', 'MSP20', 'ETC']);
  });

  it('MSP_STAGES에 4단계가 순서대로 정의되어야 한다', () => {
    expect(MSP_STAGES.map((s) => s.value)).toEqual([
      'pre_contract',
      'contracted',
      'completed',
      'settled',
    ]);
  });

  it('EDU_STAGES에 5단계가 순서대로 정의되어야 한다', () => {
    expect(EDU_STAGES.map((s) => s.value)).toEqual([
      'proposal',
      'contracted',
      'operating',
      'op_completed',
      'settled',
    ]);
  });

  it('SIDEBAR_SECTIONS에 4개 섹션이 정의되어야 한다', () => {
    expect(SIDEBAR_SECTIONS.map((s) => s.key)).toEqual(['nxt', 'msp', 'edu', 'dev']);
  });
});

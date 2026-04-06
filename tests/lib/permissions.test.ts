// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { canAccessSection, canAccessFeature } from '@/lib/auth/permissions';

describe('canAccessSection', () => {
  it('admin은 모든 섹션에 접근 가능', () => {
    expect(canAccessSection('nxt', 'admin', 'msp')).toBe(true);
    expect(canAccessSection('msp', 'admin', 'msp')).toBe(true);
    expect(canAccessSection('edu', 'admin', 'msp')).toBe(true);
    expect(canAccessSection('dev', 'admin', 'msp')).toBe(true);
  });

  it('c_level은 모든 섹션에 접근 가능', () => {
    expect(canAccessSection('nxt', 'c_level', 'education')).toBe(true);
    expect(canAccessSection('msp', 'c_level', 'education')).toBe(true);
  });

  it('staff(MSP팀)은 MSP 섹션만 접근 가능', () => {
    expect(canAccessSection('nxt', 'staff', 'msp')).toBe(false);
    expect(canAccessSection('msp', 'staff', 'msp')).toBe(true);
    expect(canAccessSection('edu', 'staff', 'msp')).toBe(false);
    expect(canAccessSection('dev', 'staff', 'msp')).toBe(false);
  });

  it('team_lead(교육팀)은 EDU 섹션만 접근 가능', () => {
    expect(canAccessSection('nxt', 'team_lead', 'education')).toBe(false);
    expect(canAccessSection('edu', 'team_lead', 'education')).toBe(true);
    expect(canAccessSection('msp', 'team_lead', 'education')).toBe(false);
  });
});

describe('canAccessFeature', () => {
  it('staff는 매출 분석에 접근 불가', () => {
    expect(canAccessFeature('revenue_all', 'staff')).toBe(false);
    expect(canAccessFeature('revenue_team', 'staff')).toBe(false);
  });

  it('team_lead는 팀 매출만 접근 가능', () => {
    expect(canAccessFeature('revenue_all', 'team_lead')).toBe(false);
    expect(canAccessFeature('revenue_team', 'team_lead')).toBe(true);
  });

  it('c_level은 전사 매출 접근 가능', () => {
    expect(canAccessFeature('revenue_all', 'c_level')).toBe(true);
    expect(canAccessFeature('revenue_team', 'c_level')).toBe(true);
  });

  it('admin만 사용자 관리 접근 가능', () => {
    expect(canAccessFeature('user_management', 'admin')).toBe(true);
    expect(canAccessFeature('user_management', 'c_level')).toBe(false);
    expect(canAccessFeature('user_management', 'staff')).toBe(false);
  });
});

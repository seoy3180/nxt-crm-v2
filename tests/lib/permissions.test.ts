// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { canAccessSection, canAccessFeature } from '@/lib/auth/permissions';

describe('canAccessSection', () => {
  it('admin은 모든 섹션에 접근 가능', () => {
    expect(canAccessSection('nxt', 'admin', 'ops')).toBe(true);
    expect(canAccessSection('msp', 'admin', 'ops')).toBe(true);
    expect(canAccessSection('edu', 'admin', 'ops')).toBe(true);
    expect(canAccessSection('dev', 'admin', 'ops')).toBe(true);
  });

  it('c_level은 모든 섹션에 접근 가능', () => {
    expect(canAccessSection('nxt', 'c_level', 'tt')).toBe(true);
    expect(canAccessSection('msp', 'c_level', 'tt')).toBe(true);
  });

  it('staff(ptn팀)은 MSP 섹션만 접근, NXT·EDU·DEV 차단', () => {
    expect(canAccessSection('nxt', 'staff', 'ptn')).toBe(false);
    expect(canAccessSection('msp', 'staff', 'ptn')).toBe(true);
    expect(canAccessSection('edu', 'staff', 'ptn')).toBe(false);
    expect(canAccessSection('dev', 'staff', 'ptn')).toBe(false);
  });

  it('team_lead(tt팀)은 EDU 섹션만 접근', () => {
    expect(canAccessSection('nxt', 'team_lead', 'tt')).toBe(false);
    expect(canAccessSection('edu', 'team_lead', 'tt')).toBe(true);
    expect(canAccessSection('msp', 'team_lead', 'tt')).toBe(false);
  });

  it('ops팀은 EDU·MSP 둘 다 접근 (M:N 매핑)', () => {
    expect(canAccessSection('edu', 'staff', 'ops')).toBe(true);
    expect(canAccessSection('msp', 'staff', 'ops')).toBe(true);
    expect(canAccessSection('dev', 'staff', 'ops')).toBe(false);
    expect(canAccessSection('nxt', 'staff', 'ops')).toBe(false);
  });
});

describe('canAccessFeature', () => {
  it('staff는 매출 분석에 접근 불가', () => {
    expect(canAccessFeature('revenue_all', 'staff')).toBe(false);
    expect(canAccessFeature('revenue_team', 'staff')).toBe(false);
  });

  it('team_lead는 매출 분석 접근 불가 (NXT 섹션이 admin·c_level 전용)', () => {
    expect(canAccessFeature('revenue_all', 'team_lead')).toBe(false);
    expect(canAccessFeature('revenue_team', 'team_lead')).toBe(false);
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

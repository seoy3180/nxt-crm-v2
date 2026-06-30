import { describe, it, expect } from 'vitest';
import { validatePeriod, formatPeriod, isExpired, localToday } from './period';

describe('validatePeriod', () => {
  it('둘 다 비면 통과(null)', () => {
    expect(validatePeriod(null, null)).toBeNull();
  });
  it('시작일만 있으면 통과(null)', () => {
    expect(validatePeriod('2026-01-01', null)).toBeNull();
  });
  it('둘 다 있고 종료>=시작이면 통과(null)', () => {
    expect(validatePeriod('2026-01-01', '2026-12-31')).toBeNull();
  });
  it('종료일만 있으면 에러', () => {
    expect(validatePeriod(null, '2026-12-31')).toBe('종료일을 입력하려면 시작일이 필요합니다');
  });
  it('종료일이 시작일보다 빠르면 에러', () => {
    expect(validatePeriod('2026-12-31', '2026-01-01')).toBe('종료일은 시작일보다 빠를 수 없습니다');
  });
  it('시작일=종료일이면 통과', () => {
    expect(validatePeriod('2026-06-30', '2026-06-30')).toBeNull();
  });
});

describe('formatPeriod', () => {
  it('둘 다 비면 빈 문자열', () => {
    expect(formatPeriod(null, null)).toBe('');
  });
  it('둘 다 있으면 "시작 ~ 종료"', () => {
    expect(formatPeriod('2026-01-01', '2026-12-31')).toBe('2026-01-01 ~ 2026-12-31');
  });
  it('시작일만이면 "시작 ~"', () => {
    expect(formatPeriod('2026-01-01', null)).toBe('2026-01-01 ~');
  });
});

describe('isExpired', () => {
  it('종료일이 오늘보다 과거면 true', () => {
    expect(isExpired('2026-01-01', '2026-06-30')).toBe(true);
  });
  it('종료일 당일은 유효(false)', () => {
    expect(isExpired('2026-06-30', '2026-06-30')).toBe(false);
  });
  it('종료일이 미래면 false', () => {
    expect(isExpired('2026-12-31', '2026-06-30')).toBe(false);
  });
  it('종료일 없으면 false', () => {
    expect(isExpired(null, '2026-06-30')).toBe(false);
  });
});

describe('localToday', () => {
  it('YYYY-MM-DD 형식을 반환한다', () => {
    expect(localToday()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

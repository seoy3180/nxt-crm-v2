import { describe, it, expect } from 'vitest';
import { cn, formatRevenue, formatTimeAgo } from './utils';

describe('cn', () => {
  it('여러 클래스를 병합한다', () => {
    const result = cn('px-2', 'py-1');
    expect(result).toBe('px-2 py-1');
  });

  it('조건부 클래스를 처리한다', () => {
    const result = cn('base', false && 'hidden', 'visible');
    expect(result).toBe('base visible');
  });

  it('Tailwind 클래스 충돌을 해결한다', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('빈 입력을 처리한다', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('undefined와 null을 무시한다', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });
});

describe('formatRevenue', () => {
  it('1억 이상은 억 단위로 표시한다', () => {
    expect(formatRevenue(100000000)).toBe('₩ 1.0억');
    expect(formatRevenue(250000000)).toBe('₩ 2.5억');
    expect(formatRevenue(1500000000)).toBe('₩ 15.0억');
  });

  it('1천만 이상 1억 미만은 천만 단위로 표시한다', () => {
    expect(formatRevenue(10000000)).toBe('₩ 1.0천만');
    expect(formatRevenue(50000000)).toBe('₩ 5.0천만');
    expect(formatRevenue(99000000)).toBe('₩ 9.9천만');
  });

  it('1만 이상 1천만 미만은 만 단위로 표시한다', () => {
    expect(formatRevenue(10000)).toBe('₩ 1만');
    expect(formatRevenue(500000)).toBe('₩ 50만');
    expect(formatRevenue(9999999)).toBe('₩ 1,000만');
  });

  it('1만 미만은 원 단위로 표시한다', () => {
    expect(formatRevenue(0)).toBe('₩ 0');
    expect(formatRevenue(5000)).toBe('₩ 5,000');
    expect(formatRevenue(9999)).toBe('₩ 9,999');
  });

  it('음수를 처리한다', () => {
    expect(formatRevenue(-1000)).toBe('₩ -1,000');
  });
});

describe('formatTimeAgo', () => {
  it('60분 미만은 N분 전으로 표시한다', () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60000).toISOString();
    expect(formatTimeAgo(fiveMinAgo)).toBe('5분 전');
  });

  it('0분 전을 표시한다', () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe('0분 전');
  });

  it('24시간 미만은 N시간 전으로 표시한다', () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 3 * 3600000).toISOString();
    expect(formatTimeAgo(threeHoursAgo)).toBe('3시간 전');
  });

  it('24시간 이상은 N일 전으로 표시한다', () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString();
    expect(formatTimeAgo(twoDaysAgo)).toBe('2일 전');
  });

  it('정확히 1시간은 1시간 전으로 표시한다', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
    expect(formatTimeAgo(oneHourAgo)).toBe('1시간 전');
  });

  it('정확히 24시간은 1일 전으로 표시한다', () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 86400000).toISOString();
    expect(formatTimeAgo(oneDayAgo)).toBe('1일 전');
  });
});

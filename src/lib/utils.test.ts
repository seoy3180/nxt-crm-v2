import { describe, it, expect } from 'vitest';
import { cn, formatRevenue, formatTimeAgo, formatThousands, stripThousands } from './utils';

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

describe('formatThousands', () => {
  it('천단위 쉼표를 삽입한다', () => {
    expect(formatThousands('1234567')).toBe('1,234,567');
    expect(formatThousands(1000)).toBe('1,000');
    expect(formatThousands('999')).toBe('999');
  });

  it('숫자 이외 문자를 제거한 뒤 포맷한다', () => {
    expect(formatThousands('1,234,567')).toBe('1,234,567');
    expect(formatThousands('abc12ab34')).toBe('1,234');
  });

  it('앞자리 0을 제거한다', () => {
    expect(formatThousands('007')).toBe('7');
    expect(formatThousands('0')).toBe('0');
    expect(formatThousands('00')).toBe('0');
  });

  it('빈 값은 빈 문자열을 반환한다', () => {
    expect(formatThousands('')).toBe('');
    expect(formatThousands(null)).toBe('');
    expect(formatThousands(undefined)).toBe('');
  });

  it('allowNegative가 있으면 음수 부호를 보존한다', () => {
    expect(formatThousands('-1234', { allowNegative: true })).toBe('-1,234');
    expect(formatThousands('-', { allowNegative: true })).toBe('-');
  });

  it('allowNegative가 없으면 음수 부호를 제거한다', () => {
    expect(formatThousands('-1234')).toBe('1,234');
  });
});

describe('stripThousands', () => {
  it('쉼표를 제거해 raw 숫자 문자열을 반환한다', () => {
    expect(stripThousands('1,234,567')).toBe('1234567');
    expect(stripThousands('999')).toBe('999');
  });

  it('앞자리 0을 제거한다', () => {
    expect(stripThousands('007')).toBe('7');
    expect(stripThousands('0')).toBe('0');
    expect(stripThousands('00')).toBe('0');
  });

  it('빈 값은 빈 문자열을 반환한다', () => {
    expect(stripThousands('')).toBe('');
  });

  it('allowNegative가 있으면 음수 부호를 보존한다', () => {
    expect(stripThousands('-1,234', { allowNegative: true })).toBe('-1234');
    expect(stripThousands('-', { allowNegative: true })).toBe('-');
  });

  it('allowNegative가 없으면 음수 부호를 제거한다', () => {
    expect(stripThousands('-1,234')).toBe('1234');
  });
});

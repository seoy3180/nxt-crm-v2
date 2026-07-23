import { describe, it, expect } from 'vitest';
import { computeUnionIds } from './union';

describe('computeUnionIds', () => {
  it('빈 배열들을 합치면 빈 결과, truncated는 false', () => {
    expect(computeUnionIds([[], []], 10)).toEqual({ ids: [], truncated: false });
  });

  it('여러 소스의 id를 중복 제거해 합친다', () => {
    const result = computeUnionIds([['a', 'b'], ['b', 'c']], 10);
    expect(new Set(result.ids)).toEqual(new Set(['a', 'b', 'c']));
    expect(result.truncated).toBe(false);
  });

  it('상한을 초과하면 상한만큼 잘라내고 truncated=true', () => {
    const result = computeUnionIds([['a', 'b', 'c', 'd']], 2);
    expect(result.ids.length).toBe(2);
    expect(result.truncated).toBe(true);
  });

  it('상한과 정확히 같으면 truncated=false', () => {
    const result = computeUnionIds([['a', 'b']], 2);
    expect(result.ids.length).toBe(2);
    expect(result.truncated).toBe(false);
  });
});

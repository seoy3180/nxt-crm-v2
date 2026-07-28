import { describe, it, expect } from 'vitest';
import {
  normalizeSearchTerm,
  escapeLikeWildcards,
  toLikePattern,
  toOrFilterValue,
  buildIlikeOrClause,
} from './escape';

describe('normalizeSearchTerm', () => {
  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeSearchTerm('  삼성SDS  ')).toBe('삼성SDS');
  });
  it('중간 공백도 제거한다', () => {
    expect(normalizeSearchTerm('삼성 전자')).toBe('삼성전자');
  });
  it('여러 공백/탭이 섞여 있어도 모두 제거한다', () => {
    expect(normalizeSearchTerm(' 삼성  전자\t주식회사 ')).toBe('삼성전자주식회사');
  });
  it('빈 문자열이면 null', () => {
    expect(normalizeSearchTerm('')).toBeNull();
  });
  it('공백만 있으면 null', () => {
    expect(normalizeSearchTerm('   ')).toBeNull();
  });
});

describe('escapeLikeWildcards', () => {
  it('%를 리터럴로 이스케이프한다', () => {
    expect(escapeLikeWildcards('50%')).toBe('50\\%');
  });
  it('_를 리터럴로 이스케이프한다', () => {
    expect(escapeLikeWildcards('홍_길')).toBe('홍\\_길');
  });
  it('백슬래시 자체도 이스케이프한다(순서: 백슬래시 먼저)', () => {
    expect(escapeLikeWildcards('a\\b')).toBe('a\\\\b');
  });
  it('와일드카드 없는 문자열은 그대로', () => {
    expect(escapeLikeWildcards('삼성SDS')).toBe('삼성SDS');
  });
});

describe('toLikePattern', () => {
  it('앞뒤에 %를 붙이고 내부는 이스케이프한다', () => {
    expect(toLikePattern('50%')).toBe('%50\\%%');
  });
  it('(주) 같은 괄호는 그대로 유지된다(LIKE 특수문자 아님)', () => {
    expect(toLikePattern('(주)')).toBe('%(주)%');
  });
});

describe('toOrFilterValue', () => {
  it('큰따옴표로 감싼다', () => {
    expect(toOrFilterValue('(주)')).toBe('"(주)"');
  });
  it('내부 큰따옴표를 이스케이프한다', () => {
    expect(toOrFilterValue('a"b')).toBe('"a\\"b"');
  });
  it('내부 백슬래시를 이스케이프한다', () => {
    expect(toOrFilterValue('a\\b')).toBe('"a\\\\b"');
  });
});

describe('buildIlikeOrClause', () => {
  it('여러 컬럼에 동일 패턴을 ilike로 매칭하는 or() 문자열을 만든다', () => {
    const pattern = toLikePattern('(주)');
    expect(buildIlikeOrClause(['name', 'phone'], pattern)).toBe(
      'name.ilike."%(주)%",phone.ilike."%(주)%"',
    );
  });
  it('쉼표가 포함된 검색어도 하나의 값으로 안전하게 처리된다', () => {
    const pattern = toLikePattern('a,b');
    expect(buildIlikeOrClause(['name'], pattern)).toBe('name.ilike."%a,b%"');
  });
});

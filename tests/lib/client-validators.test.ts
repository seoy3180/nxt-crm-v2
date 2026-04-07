// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  clientCreateSchema,
  clientUpdateSchema,
  contactCreateSchema,
  clientListQuerySchema,
} from '@/lib/validators/client';

describe('clientCreateSchema', () => {
  it('유효한 고객 데이터를 통과시킨다', () => {
    const result = clientCreateSchema.safeParse({
      name: '서울대학교',
      clientType: 'univ',
      grade: 'A',
      businessTypes: ['tt'],
      memo: '주요 교육 고객',
    });
    expect(result.success).toBe(true);
  });

  it('고객명 없으면 거부', () => {
    const result = clientCreateSchema.safeParse({
      name: '',
      clientType: 'univ',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 고객 유형 거부', () => {
    const result = clientCreateSchema.safeParse({
      name: '테스트',
      clientType: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('고객명 200자 초과 거부', () => {
    const result = clientCreateSchema.safeParse({
      name: 'a'.repeat(201),
      clientType: 'corp',
    });
    expect(result.success).toBe(false);
  });
});

describe('clientUpdateSchema', () => {
  it('부분 업데이트를 허용한다', () => {
    const result = clientUpdateSchema.safeParse({ name: '변경된 이름' });
    expect(result.success).toBe(true);
  });
});

describe('contactCreateSchema', () => {
  it('이름만 있으면 통과', () => {
    const result = contactCreateSchema.safeParse({ name: '홍길동' });
    expect(result.success).toBe(true);
  });

  it('이름 없으면 거부', () => {
    const result = contactCreateSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('잘못된 이메일 형식 거부', () => {
    const result = contactCreateSchema.safeParse({
      name: '홍길동',
      email: 'not-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('clientListQuerySchema', () => {
  it('기본값 적용', () => {
    const result = clientListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('필터를 허용한다', () => {
    const result = clientListQuerySchema.parse({
      clientType: 'univ',
      businessType: 'msp',
      search: '서울',
    });
    expect(result.clientType).toBe('univ');
    expect(result.businessType).toBe('msp');
    expect(result.search).toBe('서울');
  });
});

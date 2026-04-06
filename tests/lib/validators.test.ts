// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { loginSchema, paginationSchema, passwordChangeSchema } from '@/lib/validators/common';

describe('loginSchema', () => {
  it('유효한 이메일/비밀번호를 통과시킨다', () => {
    const result = loginSchema.safeParse({
      email: 'test@nxtcloud.kr',
      password: 'password123',
    });
    expect(result.success).toBe(true);
  });

  it('빈 이메일을 거부한다', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 이메일 형식을 거부한다', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(result.success).toBe(false);
  });

  it('6자 미만 비밀번호를 거부한다', () => {
    const result = loginSchema.safeParse({
      email: 'test@nxtcloud.kr',
      password: '12345',
    });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('기본값을 적용한다', () => {
    const result = paginationSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('pageSize 100 초과를 거부한다', () => {
    const result = paginationSchema.safeParse({ pageSize: 200 });
    expect(result.success).toBe(false);
  });
});

describe('passwordChangeSchema', () => {
  it('비밀번호 불일치를 거부한다', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newpass123',
      confirmPassword: 'different',
    });
    expect(result.success).toBe(false);
  });

  it('일치하는 비밀번호를 통과시킨다', () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: 'oldpass123',
      newPassword: 'newpass123',
      confirmPassword: 'newpass123',
    });
    expect(result.success).toBe(true);
  });
});

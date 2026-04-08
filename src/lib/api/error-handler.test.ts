// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { ZodError, ZodIssue } from 'zod';
import { handleApiError } from './error-handler';

describe('handleApiError', () => {
  it('ZodError를 400으로 변환한다', async () => {
    const zodError = new ZodError([
      { code: 'too_small', minimum: 1, type: 'string', inclusive: true, message: '이름은 필수입니다', path: ['name'] } as unknown as ZodIssue,
    ]);

    const response = handleApiError(zodError);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('이름은 필수입니다');
  });

  it('PGRST116 코드는 404로 변환한다', async () => {
    const err = new Error('not found');
    (err as unknown as { code: string }).code = 'PGRST116';

    const response = handleApiError(err);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe('요청하신 항목을 찾을 수 없습니다');
  });

  it('42501 코드는 403으로 변환한다', async () => {
    const err = new Error('forbidden');
    (err as unknown as { code: string }).code = '42501';

    const response = handleApiError(err);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('접근 권한이 없습니다');
  });

  it('23505 코드는 409로 변환한다', async () => {
    const err = new Error('duplicate');
    (err as unknown as { code: string }).code = '23505';

    const response = handleApiError(err);
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error).toBe('중복된 데이터가 존재합니다');
  });

  it('일반 Error는 500으로 변환한다', async () => {
    const err = new Error('서버 내부 오류');

    const response = handleApiError(err);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('서버 내부 오류');
  });

  it('알 수 없는 타입은 500으로 변환한다', async () => {
    const response = handleApiError('문자열 에러');
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('알 수 없는 오류가 발생했습니다');
  });

  it('null은 알 수 없는 오류로 처리한다', async () => {
    const response = handleApiError(null);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('알 수 없는 오류가 발생했습니다');
  });
});

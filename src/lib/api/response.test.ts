// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { success, error } from './response';

describe('success', () => {
  it('data를 포함한 JSON 응답을 반환한다', async () => {
    const response = success({ id: '1', name: '테스트' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: '1', name: '테스트' });
    expect(body.error).toBeNull();
  });

  it('meta 정보를 포함할 수 있다', async () => {
    const meta = { page: 1, pageSize: 10, total: 50, totalPages: 5 };
    const response = success([1, 2, 3], meta);
    const body = await response.json();

    expect(body.meta).toEqual(meta);
  });

  it('meta 없이도 동작한다', async () => {
    const response = success('ok');
    const body = await response.json();

    expect(body.meta).toBeUndefined();
  });
});

describe('error', () => {
  it('에러 메시지와 상태 코드를 반환한다', async () => {
    const response = error('잘못된 요청', 400);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('잘못된 요청');
    expect(body.data).toBeNull();
  });

  it('기본 상태 코드는 400이다', async () => {
    const response = error('에러');
    expect(response.status).toBe(400);
  });

  it('500 상태 코드를 지정할 수 있다', async () => {
    const response = error('서버 오류', 500);
    expect(response.status).toBe(500);
  });
});

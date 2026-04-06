import { ZodError } from 'zod';
import { error as errorResponse } from './response';

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    const message = err.issues.map((e) => e.message).join(', ');
    return errorResponse(message, 400);
  }

  if (err instanceof Error) {
    if ('code' in err) {
      const code = (err as { code: string }).code;
      if (code === 'PGRST116') return errorResponse('요청하신 항목을 찾을 수 없습니다', 404);
      if (code === '42501') return errorResponse('접근 권한이 없습니다', 403);
      if (code === '23505') return errorResponse('중복된 데이터가 존재합니다', 409);
    }
    return errorResponse(err.message, 500);
  }

  return errorResponse('알 수 없는 오류가 발생했습니다', 500);
}

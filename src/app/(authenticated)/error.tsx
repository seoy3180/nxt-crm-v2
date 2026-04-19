'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[AuthError]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-zinc-200">오류</p>
      <h1 className="text-xl font-semibold text-zinc-900">문제가 발생했습니다</h1>
      <p className="text-sm text-zinc-500">페이지를 불러오는 중 오류가 발생했습니다.</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={reset}
          className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          다시 시도
        </button>
        <button
          onClick={() => router.push('/')}
          className="rounded-lg border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          홈으로
        </button>
      </div>
    </div>
  );
}

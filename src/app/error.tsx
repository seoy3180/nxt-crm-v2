'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-zinc-200">500</p>
      <h1 className="text-xl font-semibold text-zinc-900">오류가 발생했습니다</h1>
      <p className="text-sm text-zinc-500">잠시 후 다시 시도해주세요.</p>
      <button
        onClick={reset}
        className="mt-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}

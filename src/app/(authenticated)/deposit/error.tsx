'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        예치금 데이터를 불러올 수 없습니다.
        <button
          type="button"
          onClick={reset}
          className="ml-2 font-semibold underline hover:text-red-900"
        >
          재시도
        </button>
      </div>
    </div>
  );
}

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-zinc-200">404</p>
      <h1 className="text-xl font-semibold text-zinc-900">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-zinc-500">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
      <Link
        href="/"
        className="mt-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}

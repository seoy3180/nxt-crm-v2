export function SearchTruncatedBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
      결과가 많습니다. 검색어를 좀 더 구체적으로 입력해 주세요.
    </div>
  );
}

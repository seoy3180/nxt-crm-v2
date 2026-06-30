export function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function validatePeriod(start: string | null, end: string | null): string | null {
  if (end && !start) return '종료일을 입력하려면 시작일이 필요합니다';
  if (start && end && end < start) return '종료일은 시작일보다 빠를 수 없습니다';
  return null;
}

export function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '';
  return `${start ?? ''} ~ ${end ?? ''}`.trim();
}

export function isExpired(end: string | null, today: string = localToday()): boolean {
  return !!end && end < today;
}

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRevenue(amount: number) {
  if (amount >= 100000000) return `₩ ${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000000) return `₩ ${(amount / 10000000).toFixed(1)}천만`;
  if (amount >= 10000) return `₩ ${Math.round(amount / 10000).toLocaleString()}만`;
  return `₩ ${amount.toLocaleString()}`;
}

/** formatRevenue alias — 계약/칸반/테이블 등에서 공용 사용 */
export const formatAmount = formatRevenue;

/** 에러 객체에서 메시지를 추출. Supabase/Error/string 등 다양한 형태 대응. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) return String((err as { message: unknown }).message);
  if (typeof err === 'string') return err;
  return '알 수 없는 오류가 발생했습니다';
}

/** 계약 단계별 배지 색상 (비즈니스 타입 색상 blue/amber/zinc 제외) */
const STAGE_COLORS: Record<string, string> = {
  pre_contract: 'bg-slate-100 text-slate-600',
  proposal: 'bg-slate-100 text-slate-600',
  contracted: 'bg-violet-100 text-violet-600',
  in_progress: 'bg-indigo-100 text-indigo-600',
  completed: 'bg-emerald-100 text-emerald-600',
  settled: 'bg-teal-100 text-teal-700',
};

export function getStageColor(stage: string | null): string {
  if (!stage) return 'bg-zinc-100 text-zinc-500';
  return STAGE_COLORS[stage] ?? 'bg-zinc-100 text-zinc-500';
}

/** 문자열을 숫자로 안전하게 변환. NaN이면 null 반환. */
export function safeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function formatTimeAgo(dateStr: string | null | undefined) {
  if (!dateStr) return '-';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return '-';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

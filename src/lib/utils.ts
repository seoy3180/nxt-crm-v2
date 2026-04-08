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

export function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

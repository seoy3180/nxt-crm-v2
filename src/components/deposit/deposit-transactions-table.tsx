'use client';

import { Loader2 } from 'lucide-react';
import { TXN_TYPE_LABELS } from '@/lib/deposit/constants';
import type { DepositTransaction } from '@/lib/deposit/types';

const TYPE_STYLES: Record<DepositTransaction['txn_type'], { bg: string; text: string }> = {
  deposit: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  usage: { bg: 'bg-rose-50', text: 'text-rose-700' },
  adjustment: { bg: 'bg-zinc-100', text: 'text-zinc-700' },
  refund: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

export function DepositTransactionsTable({
  transactions,
  currency,
  isLoading,
  onVoid,
}: {
  transactions: DepositTransaction[];
  currency: 'USD' | 'KRW';
  isLoading?: boolean;
  onVoid?: (id: string) => void;
}) {
  const sym = currency === 'USD' ? '$' : '₩';
  const fmt = (n: number) => `${sym} ${new Intl.NumberFormat('ko-KR').format(Math.abs(n))}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-12">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-sm text-zinc-400">
        아직 트랜잭션이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50">
          <tr className="border-b border-zinc-200 text-left">
            <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500">일자</th>
            <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500">유형</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-zinc-500">금액</th>
            <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500">메모</th>
            <th className="w-20 px-4 py-2.5 text-xs font-semibold text-zinc-500">동작</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const style = TYPE_STYLES[t.txn_type];
            const label = TXN_TYPE_LABELS[t.txn_type];
            const isPlus = t.txn_type === 'deposit' || (t.txn_type === 'adjustment' && t.amount > 0);
            const isVoided = !!t.voided_at;
            return (
              <tr
                key={t.id}
                className={`border-b border-zinc-100 last:border-0 ${isVoided ? 'opacity-50 line-through' : ''}`}
              >
                <td className="px-4 py-3 text-zinc-600">{t.txn_date}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${style.bg} ${style.text}`}>
                    {label}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${isPlus ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isPlus ? '+ ' : '− '}{fmt(t.amount)}
                </td>
                <td className="px-4 py-3 text-zinc-600 truncate max-w-[280px]" title={t.memo ?? ''}>
                  {t.memo ?? '-'}
                </td>
                <td className="px-4 py-3">
                  {!isVoided && onVoid && (
                    <button
                      type="button"
                      onClick={() => onVoid(t.id)}
                      className="text-xs text-zinc-400 hover:text-rose-600"
                    >
                      무효화
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, FileText, Contact } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface SearchResult {
  id: string;
  type: 'client' | 'contract' | 'contact';
  name: string;
  meta: string;
  linkId?: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K 단축키
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 열릴 때 포커스
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // 검색
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    const supabase = createClient();
    const searchTerm = `%${q}%`;

    try {
    const [clientRes, contractRes, contactRes, awsRes] = await Promise.all([
      supabase
        .from('clients')
        .select('id, name, client_id, client_type')
        .is('deleted_at', null)
        .ilike('name', searchTerm)
        .limit(5),
      supabase
        .from('contracts')
        .select('id, name, contract_id, stage, type')
        .is('deleted_at', null)
        .ilike('name', searchTerm)
        .limit(5),
      supabase
        .from('contacts')
        .select('id, name, phone, email, client_id, clients!contacts_client_id_fkey(name)')
        .is('deleted_at', null)
        .ilike('name', searchTerm)
        .limit(5),
      supabase
        .from('contract_msp_details')
        .select('contract_id, aws_account_ids, contracts!contract_msp_details_contract_id_fkey(id, name, contract_id, client_id, clients!contracts_client_id_fkey(id, name, client_id))')
        .is('deleted_at', null)
        .contains('aws_account_ids', [q])
        .limit(5),
    ]);

    const clientTypes: Record<string, string> = { univ: '대학교', corp: '기업', govt: '공공기관', asso: '협회', etc: '기타' };
    const mapped: SearchResult[] = [
      ...(clientRes.data ?? []).map((c) => ({
        id: c.id,
        type: 'client' as const,
        name: c.name,
        meta: `${c.client_id} · ${clientTypes[c.client_type] ?? c.client_type}`,
      })),
      ...(contractRes.data ?? []).map((c) => ({
        id: c.id,
        type: 'contract' as const,
        name: c.name,
        meta: `${c.contract_id} · ${c.type?.toUpperCase()}`,
      })),
      ...(contactRes.data ?? []).map((c) => {
        const clientName = (c.clients as { name: string } | null)?.name ?? '';
        const parts = [clientName, c.phone, c.email].filter(Boolean);
        return {
          id: c.id,
          type: 'contact' as const,
          name: c.name,
          meta: parts.join(' · '),
          linkId: c.client_id,
        };
      }),
      ...(awsRes.data ?? []).filter((a) => {
        const contract = a.contracts as { id: string } | null;
        return contract && !contractRes.data?.some((c) => c.id === contract.id);
      }).map((a) => {
        const contract = a.contracts as { id: string; name: string; contract_id: string; type?: string };
        return {
          id: contract.id,
          type: 'contract' as const,
          name: contract.name,
          meta: `${contract.contract_id} · AWS 계정: ${q}`,
        };
      }),
    ];

    if (clientRes.error || contractRes.error || contactRes.error || awsRes.error) {
      setResults([]);
      return;
    }

    setResults(mapped);
    setSelectedIdx(0);
    } catch {
      setResults([]);
    }
  }, []);

  // 디바운스 검색
  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    if (result.type === 'client') {
      router.push(`/clients/${result.id}`);
    } else if (result.type === 'contract') {
      router.push(`/contracts/${result.id}`);
    } else if (result.type === 'contact' && result.linkId) {
      router.push(`/clients/${result.linkId}`);
    }
  }

  // 키보드 네비게이션
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault();
      handleSelect(results[selectedIdx]);
    }
  }

  if (!open) return null;

  const clients = results.filter((r) => r.type === 'client');
  const contracts = results.filter((r) => r.type === 'contract');
  const contacts = results.filter((r) => r.type === 'contact');
  let flatIdx = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="통합 검색"
        className="flex w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        style={{ maxHeight: 480 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            e.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        {/* 검색 입력 */}
        <div className="flex h-[52px] items-center gap-2.5 border-b border-zinc-200 px-5">
          <Search className="h-5 w-5 text-zinc-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="고객, 연락처, 계약 검색..."
            aria-label="고객, 연락처, 계약 검색"
            className="flex-1 bg-transparent text-base text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-400">ESC</span>
        </div>

        {/* 결과 */}
        <div className="flex-1 overflow-y-auto py-2">
          {query && results.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">검색 결과가 없습니다</p>
          )}

          {!query && (
            <p className="px-5 py-8 text-center text-sm text-zinc-400">검색어를 입력하세요</p>
          )}

          {clients.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-5 py-1">
                <span className="text-[11px] font-semibold text-zinc-400">고객</span>
              </div>
              {clients.map((r) => {
                const idx = flatIdx++;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelect(r)}
                    className={`flex h-10 w-full items-center gap-3 px-5 text-left transition-colors ${
                      idx === selectedIdx ? 'bg-blue-50' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <Users className={`h-4 w-4 ${idx === selectedIdx ? 'text-blue-600' : 'text-zinc-500'}`} />
                    <span className="text-sm font-medium text-zinc-900">{r.name}</span>
                    <span className="text-xs text-zinc-400">{r.meta}</span>
                  </button>
                );
              })}
            </div>
          )}

          {contracts.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-5 py-1">
                <span className="text-[11px] font-semibold text-zinc-400">계약</span>
              </div>
              {contracts.map((r) => {
                const idx = flatIdx++;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelect(r)}
                    className={`flex h-10 w-full items-center gap-3 px-5 text-left transition-colors ${
                      idx === selectedIdx ? 'bg-blue-50' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <FileText className={`h-4 w-4 ${idx === selectedIdx ? 'text-blue-600' : 'text-zinc-500'}`} />
                    <span className="text-sm font-medium text-zinc-900">{r.name}</span>
                    <span className="text-xs text-zinc-400">{r.meta}</span>
                  </button>
                );
              })}
            </div>
          )}

          {contacts.length > 0 && (
            <div className="space-y-0.5">
              <div className="px-5 py-1">
                <span className="text-[11px] font-semibold text-zinc-400">연락처</span>
              </div>
              {contacts.map((r) => {
                const idx = flatIdx++;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelect(r)}
                    className={`flex h-10 w-full items-center gap-3 px-5 text-left transition-colors ${
                      idx === selectedIdx ? 'bg-blue-50' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <Contact className={`h-4 w-4 ${idx === selectedIdx ? 'text-blue-600' : 'text-zinc-500'}`} />
                    <span className="text-sm font-medium text-zinc-900">{r.name}</span>
                    <span className="text-xs text-zinc-400">{r.meta}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

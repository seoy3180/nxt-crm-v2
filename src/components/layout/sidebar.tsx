'use client';

import { useCurrentUser } from '@/hooks/use-current-user';
import { useAuthContext } from '@/providers/auth-provider';
import { canAccessSection } from '@/lib/auth/permissions';
import { SIDEBAR_SECTIONS } from '@/lib/constants';
import { SidebarSection } from './sidebar-section';
import { Hexagon, Search, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

const TEAM_LABELS: Record<string, string> = {
  msp: 'MSP팀',
  education: '교육팀',
  dev: '개발팀',
};

export function Sidebar() {
  const { data: currentUser } = useCurrentUser();
  const { signOut } = useAuthContext();

  if (!currentUser) return null;

  const visibleSections = SIDEBAR_SECTIONS.filter((section) =>
    canAccessSection(
      section.key as 'nxt' | 'msp' | 'edu' | 'dev',
      currentUser.role,
      currentUser.teamType ?? 'msp',
    ),
  );

  const teamLabel = TEAM_LABELS[currentUser.teamType ?? 'msp'] ?? currentUser.teamType;

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-zinc-200 bg-zinc-50">
      {/* 로고 */}
      <div className="flex h-12 items-center gap-2.5 px-4 pt-6 pb-0">
        <div className="relative h-7 w-7">
          <Hexagon className="h-7 w-7 text-blue-600" />
          <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-blue-600">
            N
          </span>
        </div>
        <span className="text-lg font-bold text-zinc-900">NXT CRM</span>
      </div>

      {/* 검색바 spacer */}
      <div className="h-4 px-4" />

      {/* 글로벌 검색 */}
      <div className="px-4">
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-zinc-400 transition-colors hover:border-zinc-300"
          onClick={() => {
            // TODO: Cmd+K 검색 모달
          }}
        >
          <Search className="h-[15px] w-[15px]" />
          <span className="text-[13px]">검색</span>
          <span className="ml-auto">
            <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">
              ⌘K
            </span>
          </span>
        </button>
      </div>

      {/* 네비게이션 섹션 */}
      <nav className="flex-1 overflow-y-auto px-4 pt-2">
        {visibleSections.map((section, idx) => (
          <SidebarSection
            key={section.key}
            label={section.label}
            items={section.items}
            isFirst={idx === 0}
          />
        ))}
      </nav>

      {/* 사용자 프로필 */}
      <div className="border-t border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
            <span className="text-[13px] font-semibold text-white">
              {currentUser.name.slice(0, 1)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[13px] font-medium text-zinc-900">
              {currentUser.name}
            </p>
            <p className="truncate text-[11px] text-zinc-400">
              {teamLabel} · {currentUser.role}
            </p>
          </div>
          <Link href="/profile">
            <Settings className="h-4 w-4 text-zinc-400 hover:text-zinc-600 transition-colors" />
          </Link>
          <button type="button" onClick={signOut} title="로그아웃">
            <LogOut className="h-4 w-4 text-zinc-400 hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </aside>
  );
}

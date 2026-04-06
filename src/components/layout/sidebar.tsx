'use client';

import { useCurrentUser } from '@/hooks/use-current-user';
import { canAccessSection } from '@/lib/auth/permissions';
import { SIDEBAR_SECTIONS } from '@/lib/constants';
import { SidebarSection } from './sidebar-section';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Settings, Search } from 'lucide-react';
import Link from 'next/link';

export function Sidebar() {
  const { data: currentUser } = useCurrentUser();

  if (!currentUser) return null;

  const visibleSections = SIDEBAR_SECTIONS.filter((section) =>
    canAccessSection(
      section.key as 'nxt' | 'msp' | 'edu' | 'dev',
      currentUser.role,
      currentUser.teamType ?? 'msp',
    ),
  );

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-sidebar">
      {/* 로고 */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded border-2 border-accent">
          <span className="text-sm font-bold text-accent">N</span>
        </div>
        <span className="text-lg font-bold">NXT CRM</span>
      </div>

      {/* 글로벌 검색 */}
      <div className="px-3 pb-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => {
            // TODO: Cmd+K 검색 모달 (Plan 2에서 구현)
          }}
        >
          <Search className="h-4 w-4" />
          <span className="text-sm">검색...</span>
          <kbd className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            ⌘K
          </kbd>
        </Button>
      </div>

      {/* 네비게이션 섹션 */}
      <nav className="flex-1 overflow-y-auto px-2">
        {visibleSections.map((section) => (
          <SidebarSection
            key={section.key}
            label={section.label}
            items={section.items}
          />
        ))}
      </nav>

      {/* 사용자 프로필 */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent/10 text-accent text-xs">
              {currentUser.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">
              {currentUser.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentUser.position ?? currentUser.role}
            </p>
          </div>
          <Link href="/profile">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}

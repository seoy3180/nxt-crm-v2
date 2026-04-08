'use client';

import { Sidebar } from './sidebar';
import { GlobalSearch } from '@/components/common/global-search';
import { EditModeProvider } from '@/providers/edit-mode-provider';
import { useAuthContext } from '@/providers/auth-provider';
import { Skeleton } from '@/components/ui/skeleton';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return (
    <EditModeProvider>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-y-auto bg-background p-6">{children}</main>
        <GlobalSearch />
      </div>
    </EditModeProvider>
  );
}

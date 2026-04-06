'use client';

import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="대시보드" />
      <div className="grid grid-cols-4 gap-4">
        <p className="col-span-4 text-sm text-muted-foreground">
          대시보드 위젯은 Plan 2에서 구현됩니다.
        </p>
      </div>
    </div>
  );
}

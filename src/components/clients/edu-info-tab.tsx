'use client';

interface EduInfoTabProps {
  clientId: string;
}

// Plan 2B 구현 대비 prop 인터페이스만 유지. 펼침은 향후 작업에서.
export function EduInfoTab(_props: EduInfoTabProps) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      교육 정보는 Plan 2B에서 구현됩니다.
    </p>
  );
}

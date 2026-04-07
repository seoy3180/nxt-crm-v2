'use client';

interface EduInfoTabProps {
  clientId: string;
}

export function EduInfoTab({ clientId }: EduInfoTabProps) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      교육 정보는 Plan 2B에서 구현됩니다.
    </p>
  );
}

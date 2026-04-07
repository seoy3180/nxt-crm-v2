'use client';

interface MspInfoTabProps {
  clientId: string;
}

export function MspInfoTab({ clientId }: MspInfoTabProps) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      MSP 정보는 Plan 2B에서 구현됩니다.
    </p>
  );
}

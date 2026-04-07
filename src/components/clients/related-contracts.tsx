'use client';

interface RelatedContractsProps {
  clientId: string;
}

export function RelatedContracts({ clientId }: RelatedContractsProps) {
  return (
    <p className="py-8 text-center text-sm text-muted-foreground">
      관련 계약은 Plan 2B에서 구현됩니다.
    </p>
  );
}

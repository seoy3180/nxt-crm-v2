'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MspDetailRow } from '@/lib/services/contract-service';

interface MspDetailCardProps {
  details: MspDetailRow | null;
}

export function MspDetailCard({ details }: MspDetailCardProps) {
  if (!details) return null;

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">MSP 상세</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">빌링 레벨</p>
            <p className="text-sm font-medium">{details.billing_level ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">크레딧 쉐어</p>
            <p className="text-sm font-medium">{details.credit_share != null ? `${details.credit_share}%` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">예상 MRR</p>
            <p className="text-sm font-medium">{details.expected_mrr != null ? `${new Intl.NumberFormat('ko-KR').format(details.expected_mrr)}원` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">결제자</p>
            <p className="text-sm font-medium">{details.payer ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">담당 영업</p>
            <p className="text-sm font-medium">{details.sales_rep ?? '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">AWS 금액</p>
            <p className="text-sm font-medium">{details.aws_amount != null ? `${new Intl.NumberFormat('ko-KR').format(details.aws_amount)}원` : '-'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">관리비</p>
            <p className="text-sm font-medium">{details.has_management_fee ? '있음' : '없음'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

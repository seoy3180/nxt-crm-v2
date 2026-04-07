'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function EduDetailCard() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">교육 상세</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">교육 계약 전용 필드는 추후 추가됩니다.</p>
      </CardContent>
    </Card>
  );
}

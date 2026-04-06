'use client';

import { PageHeader } from '@/components/layout/page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProfilePage() {
  const { data: user } = useCurrentUser();

  if (!user) return null;

  return (
    <div>
      <PageHeader title="프로필" />
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">이름</p>
              <p className="text-sm font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">이메일</p>
              <p className="text-sm font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">직책</p>
              <p className="text-sm font-medium">{user.position ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">소속</p>
              <p className="text-sm font-medium">{user.teamType ?? '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">비밀번호 변경</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">비밀번호 변경 폼은 Plan 2에서 구현됩니다.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

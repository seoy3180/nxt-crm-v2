'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const TEAM_LABELS: Record<string, string> = {
  msp: 'MSP팀',
  education: '교육팀',
  dev: '개발팀',
};

export default function ProfilePage() {
  const { data: user } = useCurrentUser();
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});

  if (!user) return null;

  async function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwErrors({});

    const formData = new FormData(e.currentTarget);
    const currentPw = formData.get('currentPassword') as string;
    const newPw = formData.get('newPassword') as string;
    const confirmPw = formData.get('confirmPassword') as string;

    if (!currentPw) { setPwErrors({ currentPassword: '현재 비밀번호를 입력하세요' }); return; }
    if (!newPw || newPw.length < 6) { setPwErrors({ newPassword: '6자 이상 입력하세요' }); return; }
    if (newPw !== confirmPw) { setPwErrors({ confirmPassword: '비밀번호가 일치하지 않습니다' }); return; }

    setPwLoading(true);
    const supabase = createClient();

    // 현재 비밀번호 확인 (재로그인)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user!.email,
      password: currentPw,
    });

    if (signInError) {
      setPwLoading(false);
      setPwErrors({ currentPassword: '현재 비밀번호가 올바르지 않습니다' });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);

    if (error) {
      toast.error('비밀번호 변경에 실패했습니다');
      return;
    }

    toast.success('비밀번호가 변경되었습니다');
    (e.target as HTMLFormElement).reset();
  }

  return (
    <div>
      <PageHeader title="프로필" />
      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="w-[480px] rounded-xl border border-zinc-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-zinc-900">기본 정보</h2>
          <div className="space-y-1.5">
            <p className="text-[13px] text-zinc-500">이름</p>
            <p className="text-sm font-medium text-zinc-900">{user.name}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[13px] text-zinc-500">이메일</p>
            <p className="text-sm font-medium text-zinc-900">{user.email}</p>
          </div>
          <div className="flex gap-8">
            <div className="space-y-1.5">
              <p className="text-[13px] text-zinc-500">직책</p>
              <p className="text-sm font-medium text-zinc-900">{user.position ?? '-'}</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[13px] text-zinc-500">소속</p>
              <p className="text-sm font-medium text-zinc-900">{TEAM_LABELS[user.teamType ?? ''] ?? user.teamType ?? '-'}</p>
            </div>
          </div>
          <p className="text-xs text-zinc-400">직책과 소속은 관리자만 변경할 수 있습니다</p>
        </div>

        {/* 비밀번호 변경 */}
        <form onSubmit={handlePasswordChange} className="w-[480px] rounded-xl border border-zinc-200 p-6 space-y-5">
          <h2 className="text-base font-semibold text-zinc-900">비밀번호 변경</h2>
          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">현재 비밀번호</Label>
            <Input id="currentPassword" name="currentPassword" type="password" placeholder="현재 비밀번호" />
            {pwErrors.currentPassword && <p className="text-sm text-red-500">{pwErrors.currentPassword}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input id="newPassword" name="newPassword" type="password" placeholder="새 비밀번호 (6자 이상)" />
            {pwErrors.newPassword && <p className="text-sm text-red-500">{pwErrors.newPassword}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="새 비밀번호 확인" />
            {pwErrors.confirmPassword && <p className="text-sm text-red-500">{pwErrors.confirmPassword}</p>}
          </div>
          <button
            type="submit"
            disabled={pwLoading}
            className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {pwLoading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  );
}

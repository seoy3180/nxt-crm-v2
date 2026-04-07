'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';
import { loginSchema, type LoginInput } from '@/lib/validators/common';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Hexagon } from 'lucide-react';

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuthContext();
  const [errors, setErrors] = useState<Partial<Record<keyof LoginInput | 'root', string>>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const formData = new FormData(e.currentTarget);
    const raw = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    const result = loginSchema.safeParse(raw);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      result.error.issues.forEach((err) => {
        const field = err.path[0] as keyof LoginInput;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(result.data.email, result.data.password);
    setLoading(false);

    if (error) {
      setErrors({ root: '이메일 또는 비밀번호가 올바르지 않습니다' });
      return;
    }

    const redirect = searchParams.get('redirect') ?? '/dashboard';
    router.push(redirect);
  }

  return (
    <div className="w-[400px] rounded-2xl border border-zinc-200 bg-white p-10">
      <div className="flex flex-col items-center gap-6">
        {/* 로고 */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="relative h-9 w-9">
            <Hexagon className="h-9 w-9 text-blue-600" />
            <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-blue-600">
              N
            </span>
          </div>
          <span className="text-[22px] font-bold text-zinc-900">NXT CRM</span>
        </div>

        {/* 타이틀 */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-xl font-semibold text-zinc-900">로그인</h1>
          <p className="text-sm text-zinc-500">계정 정보를 입력해주세요</p>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          {errors.root && (
            <p className="text-sm text-red-500">{errors.root}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email" className="text-sm font-medium text-zinc-900">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="이메일을 입력하세요"
              autoComplete="email"
              autoFocus
              className="h-10"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password" className="text-sm font-medium text-zinc-900">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
              className="h-10"
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}

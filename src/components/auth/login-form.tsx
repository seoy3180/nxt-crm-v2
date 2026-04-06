'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/providers/auth-provider';
import { loginSchema, type LoginInput } from '@/lib/validators/common';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <Card className="w-full max-w-sm border-border">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg border-2 border-accent">
          <span className="text-xl font-bold text-accent">N</span>
        </div>
        <CardTitle className="text-2xl font-bold text-text-primary">NXT CRM</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.root && (
            <p className="text-sm text-error">{errors.root}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="이메일을 입력하세요"
              autoComplete="email"
              autoFocus
            />
            {errors.email && (
              <p className="text-sm text-error">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-sm text-error">{errors.password}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}

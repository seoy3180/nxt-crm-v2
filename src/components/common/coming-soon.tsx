import { Hammer } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
}

/** "준비 중" 빈 페이지 공통 컴포넌트 */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
        <Hammer className="h-8 w-8 text-zinc-400" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
        <p className="text-sm text-zinc-500">
          {description ?? '현재 준비 중인 기능입니다. 곧 만나보실 수 있습니다.'}
        </p>
      </div>
    </div>
  );
}

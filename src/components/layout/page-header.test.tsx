import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageHeader } from './page-header';

// next/navigation 모킹
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: mockBack,
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('PageHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('제목을 렌더링한다', () => {
    render(<PageHeader title="고객 목록" />);
    expect(screen.getByRole('heading', { level: 1, name: '고객 목록' })).toBeInTheDocument();
  });

  it('설명이 있으면 렌더링한다', () => {
    render(<PageHeader title="고객 목록" description="전체 고객을 관리합니다" />);
    expect(screen.getByText('전체 고객을 관리합니다')).toBeInTheDocument();
  });

  it('설명이 없으면 렌더링하지 않는다', () => {
    render(<PageHeader title="고객 목록" />);
    expect(screen.queryByText('전체 고객을 관리합니다')).not.toBeInTheDocument();
  });

  it('actions를 렌더링한다', () => {
    render(
      <PageHeader title="고객 목록" actions={<button>새 고객</button>} />
    );
    expect(screen.getByRole('button', { name: '새 고객' })).toBeInTheDocument();
  });

  it('backButton이 true면 뒤로가기 버튼을 렌더링한다', () => {
    render(<PageHeader title="상세" backButton />);
    // 뒤로가기 버튼이 존재하는지 확인
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('뒤로가기 버튼 클릭 시 router.back()이 호출된다', async () => {
    const user = userEvent.setup();
    render(<PageHeader title="상세" backButton />);

    const backButton = screen.getAllByRole('button')[0];
    await user.click(backButton!);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('backButton이 없으면 뒤로가기 버튼이 없다', () => {
    render(<PageHeader title="목록" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

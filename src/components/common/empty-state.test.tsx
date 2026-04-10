import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('메시지를 렌더링한다', () => {
    render(<EmptyState message="데이터가 없습니다" />);
    expect(screen.getByText('데이터가 없습니다')).toBeInTheDocument();
  });

  it('actionLabel과 onAction이 있으면 버튼을 렌더링한다', () => {
    const handleAction = vi.fn();
    render(<EmptyState message="비어있음" actionLabel="추가하기" onAction={handleAction} />);

    expect(screen.getByRole('button', { name: '추가하기' })).toBeInTheDocument();
  });

  it('버튼 클릭 시 onAction이 호출된다', async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();
    render(<EmptyState message="비어있음" actionLabel="추가하기" onAction={handleAction} />);

    await user.click(screen.getByRole('button', { name: '추가하기' }));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('actionLabel이 없으면 버튼을 렌더링하지 않는다', () => {
    render(<EmptyState message="비어있음" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('onAction이 없으면 버튼을 렌더링하지 않는다', () => {
    render(<EmptyState message="비어있음" actionLabel="추가하기" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

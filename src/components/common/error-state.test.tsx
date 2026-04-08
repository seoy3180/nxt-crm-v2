import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('기본 에러 메시지를 렌더링한다', () => {
    render(<ErrorState />);
    expect(screen.getByText('데이터를 불러올 수 없습니다.')).toBeInTheDocument();
  });

  it('커스텀 에러 메시지를 렌더링한다', () => {
    render(<ErrorState message="네트워크 오류" />);
    expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
  });

  it('onRetry가 있으면 다시 시도 버튼을 렌더링한다', () => {
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('다시 시도 버튼 클릭 시 onRetry가 호출된다', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    render(<ErrorState onRetry={handleRetry} />);

    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('onRetry가 없으면 버튼을 렌더링하지 않는다', () => {
    render(<ErrorState />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

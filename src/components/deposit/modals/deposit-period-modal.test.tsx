import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepositPeriodModal } from './deposit-period-modal';

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock('@/hooks/use-deposit-mutations', () => ({
  useUpdateDepositPeriod: () => ({ mutateAsync, isPending: false }),
}));

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(undefined);
});

function open(props: { initialStart?: string | null; initialEnd?: string | null } = {}) {
  render(
    <DepositPeriodModal open onOpenChange={() => {}} accountId="acc-1" contractId="ct-1" initialStart={null} initialEnd={null} {...props} />,
  );
}

describe('DepositPeriodModal', () => {
  it('미설정 상태에서는 종료일 입력이 비활성화된다', () => {
    open();
    expect(screen.getByLabelText('종료일')).toBeDisabled();
  });

  it('유효한 기간 저장 시 mutation을 호출한다', async () => {
    const user = userEvent.setup();
    open();
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('종료일'), { target: { value: '2026-12-31' } });
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      accountId: 'acc-1',
      contractId: 'ct-1',
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      oldStart: null,
      oldEnd: null,
    });
  });

  it('시작일을 비우면 기간이 미설정으로 클리어된다', async () => {
    const user = userEvent.setup();
    open({ initialStart: '2026-01-01', initialEnd: '2026-12-31' });
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '' } });
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(mutateAsync).toHaveBeenCalledWith({
      accountId: 'acc-1',
      contractId: 'ct-1',
      start_date: null,
      end_date: null,
      oldStart: '2026-01-01',
      oldEnd: '2026-12-31',
    });
  });
});

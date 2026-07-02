import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DepositPeriodFields } from './deposit-period-fields';

describe('DepositPeriodFields', () => {
  it('시작일·종료일 입력과 현재 값을 렌더링한다', () => {
    render(
      <DepositPeriodFields startDate="2026-01-01" endDate="2026-12-31" onStartChange={() => {}} onEndChange={() => {}} />,
    );
    expect(screen.getByLabelText('시작일')).toHaveValue('2026-01-01');
    expect(screen.getByLabelText('종료일')).toHaveValue('2026-12-31');
  });

  it('시작일 변경 시 onStartChange를 호출한다', () => {
    const onStartChange = vi.fn();
    render(<DepositPeriodFields startDate="" endDate="" onStartChange={onStartChange} onEndChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '2026-02-02' } });
    expect(onStartChange).toHaveBeenCalledWith('2026-02-02');
  });

  it('error가 있으면 메시지를 표시한다', () => {
    render(
      <DepositPeriodFields startDate="" endDate="" onStartChange={() => {}} onEndChange={() => {}} error="종료일을 입력하려면 시작일이 필요합니다" />,
    );
    expect(screen.getByText('종료일을 입력하려면 시작일이 필요합니다')).toBeInTheDocument();
  });

  it('시작일이 비면 종료일 입력이 비활성화된다', () => {
    render(<DepositPeriodFields startDate="" endDate="" onStartChange={() => {}} onEndChange={() => {}} />);
    expect(screen.getByLabelText('종료일')).toBeDisabled();
  });

  it('시작일이 있으면 종료일 입력이 활성화된다', () => {
    render(<DepositPeriodFields startDate="2026-01-01" endDate="" onStartChange={() => {}} onEndChange={() => {}} />);
    expect(screen.getByLabelText('종료일')).toBeEnabled();
  });

  it('종료일의 최소 선택일은 시작일이다', () => {
    render(<DepositPeriodFields startDate="2026-01-01" endDate="" onStartChange={() => {}} onEndChange={() => {}} />);
    expect(screen.getByLabelText('종료일')).toHaveAttribute('min', '2026-01-01');
  });

  it('시작일을 비우면 종료일도 비운다', () => {
    const onEndChange = vi.fn();
    render(
      <DepositPeriodFields startDate="2026-01-01" endDate="2026-12-31" onStartChange={() => {}} onEndChange={onEndChange} />,
    );
    fireEvent.change(screen.getByLabelText('시작일'), { target: { value: '' } });
    expect(onEndChange).toHaveBeenCalledWith('');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './kpi-card';

describe('KpiCard', () => {
  it('label, value, change 텍스트를 렌더링한다', () => {
    render(<KpiCard label="총 매출" value="₩ 1.5억" change="+12% 전월 대비" />);

    expect(screen.getByText('총 매출')).toBeInTheDocument();
    expect(screen.getByText('₩ 1.5억')).toBeInTheDocument();
    expect(screen.getByText('+12% 전월 대비')).toBeInTheDocument();
  });

  it('changeColor 기본값은 text-zinc-500이다', () => {
    render(<KpiCard label="고객" value="120" change="+5" />);

    const changeEl = screen.getByText('+5');
    expect(changeEl).toHaveClass('text-zinc-500');
  });

  it('changeColor를 커스텀으로 지정할 수 있다', () => {
    render(<KpiCard label="매출" value="₩ 2억" change="+20%" changeColor="text-green-600" />);

    const changeEl = screen.getByText('+20%');
    expect(changeEl).toHaveClass('text-green-600');
    expect(changeEl).not.toHaveClass('text-zinc-500');
  });

  it('빈 값도 렌더링한다', () => {
    render(<KpiCard label="" value="" change="" />);

    // 렌더링 자체가 에러 없이 완료되어야 한다
    expect(document.querySelectorAll('span')).toHaveLength(3);
  });
});

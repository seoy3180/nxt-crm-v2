import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonCard } from './skeleton-card';

describe('SkeletonCard', () => {
  it('에러 없이 렌더링된다', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.firstChild).toBeTruthy();
  });
});

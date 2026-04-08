import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditModeProvider, useEditMode } from './edit-mode-provider';

function TestConsumer() {
  const { isEditing, setIsEditing } = useEditMode();
  return (
    <div>
      <span data-testid="status">{isEditing ? '편집중' : '보기'}</span>
      <button onClick={() => setIsEditing(!isEditing)}>토글</button>
    </div>
  );
}

describe('EditModeProvider', () => {
  it('초기 상태는 편집 모드가 꺼져 있다', () => {
    render(
      <EditModeProvider>
        <TestConsumer />
      </EditModeProvider>
    );
    expect(screen.getByTestId('status')).toHaveTextContent('보기');
  });

  it('setIsEditing으로 편집 모드를 토글한다', async () => {
    const user = userEvent.setup();
    render(
      <EditModeProvider>
        <TestConsumer />
      </EditModeProvider>
    );

    await user.click(screen.getByRole('button', { name: '토글' }));
    expect(screen.getByTestId('status')).toHaveTextContent('편집중');

    await user.click(screen.getByRole('button', { name: '토글' }));
    expect(screen.getByTestId('status')).toHaveTextContent('보기');
  });

  it('Provider 없이 useEditMode를 사용하면 기본값을 반환한다', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('status')).toHaveTextContent('보기');
  });
});

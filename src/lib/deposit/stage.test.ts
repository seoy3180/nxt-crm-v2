import { describe, it, expect } from 'vitest';
import { isEndedStage } from './stage';

describe('isEndedStage', () => {
  it('project_closed(프로젝트 종료)는 종료', () => {
    expect(isEndedStage('project_closed')).toBe(true);
  });
  it('unpaid(미납/해지)는 종료', () => {
    expect(isEndedStage('unpaid')).toBe(true);
  });
  it('pre_contract는 진행 중', () => {
    expect(isEndedStage('pre_contract')).toBe(false);
  });
  it('billing_complete는 진행 중', () => {
    expect(isEndedStage('billing_complete')).toBe(false);
  });
  it('null은 진행 중 취급 (보수적 숨김)', () => {
    expect(isEndedStage(null)).toBe(false);
  });
  it('MSP 목록 외 값(예: 교육 스테이지)은 진행 중 취급', () => {
    expect(isEndedStage('operating')).toBe(false);
  });
});

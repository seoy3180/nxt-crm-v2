// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  contractCreateSchema,
  contractUpdateSchema,
  mspDetailSchema,
  eduOperationSchema,
  stageChangeSchema,
  contractListQuerySchema,
} from '@/lib/validators/contract';

describe('contractCreateSchema', () => {
  it('유효한 MSP 계약을 통과시킨다', () => {
    const result = contractCreateSchema.safeParse({
      name: '삼성SDS MSP',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'msp',
      totalAmount: 120000000,
    });
    expect(result.success).toBe(true);
  });

  it('유효한 교육 계약을 통과시킨다', () => {
    const result = contractCreateSchema.safeParse({
      name: 'AWS 교육',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'tt',
      totalAmount: 30000000,
    });
    expect(result.success).toBe(true);
  });

  it('계약명 없으면 거부', () => {
    const result = contractCreateSchema.safeParse({
      name: '',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'msp',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 type 거부', () => {
    const result = contractCreateSchema.safeParse({
      name: '테스트',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('음수 금액 거부', () => {
    const result = contractCreateSchema.safeParse({
      name: '테스트',
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'msp',
      totalAmount: -1,
    });
    expect(result.success).toBe(false);
  });
});

describe('mspDetailSchema', () => {
  it('MSP 확장 필드를 통과시킨다', () => {
    const result = mspDetailSchema.safeParse({
      billingLevel: 'MSP15',
      creditShare: 15.0,
      expectedMrr: 10000000,
      payer: '삼성SDS',
      salesRep: '박진성',
      awsAmount: 100000000,
      hasManagementFee: true,
    });
    expect(result.success).toBe(true);
  });

  it('모두 선택사항이므로 빈 객체도 통과', () => {
    const result = mspDetailSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('eduOperationSchema', () => {
  it('운영 데이터를 통과시킨다', () => {
    const result = eduOperationSchema.safeParse({
      operationName: 'AWS 기초 1차',
      location: '서울대',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
      contractedCount: 30,
      providesLunch: true,
      providesSnack: false,
    });
    expect(result.success).toBe(true);
  });

  it('운영명 없으면 거부', () => {
    const result = eduOperationSchema.safeParse({
      operationName: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('stageChangeSchema', () => {
  it('단계 변경을 통과시킨다', () => {
    const result = stageChangeSchema.safeParse({
      toStage: 'contracted',
      note: '계약 체결 완료',
    });
    expect(result.success).toBe(true);
  });

  it('단계 없으면 거부', () => {
    const result = stageChangeSchema.safeParse({
      toStage: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('contractListQuerySchema', () => {
  it('기본값 적용', () => {
    const result = contractListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('필터를 허용한다', () => {
    const result = contractListQuerySchema.parse({
      type: 'msp',
      stage: 'contracted',
      search: '삼성',
    });
    expect(result.type).toBe('msp');
    expect(result.stage).toBe('contracted');
  });
});

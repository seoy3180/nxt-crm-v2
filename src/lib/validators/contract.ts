import { z } from 'zod';

const contractTypeEnum = z.enum(['msp', 'tt', 'dev']);
const currencyEnum = z.enum(['KRW', 'USD']);

export const contractCreateSchema = z.object({
  name: z.string().min(1, '계약명을 입력해주세요').max(200, '최대 200자까지 입력할 수 있습니다'),
  clientId: z.string().uuid('고객을 선택해주세요'),
  type: contractTypeEnum,
  memo: z.string().optional().nullable(),
  totalAmount: z.number().int().min(0, '금액은 0 이상이어야 합니다').default(0),
  currency: currencyEnum.default('KRW'),
  stage: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
});

export type ContractCreateInput = z.infer<typeof contractCreateSchema>;

export const contractUpdateSchema = contractCreateSchema.partial().omit({ type: true, clientId: true });
export type ContractUpdateInput = z.infer<typeof contractUpdateSchema>;

export const mspDetailSchema = z.object({
  creditShare: z.enum(['가능', '불가능', '미정']).optional().nullable(),
  expectedMrr: z.number().int().min(0).optional().nullable(),
  payer: z.enum(['ETV-AWS-13', 'ETV-AWS-14', 'Org-001', 'Billing Transfer']).optional().nullable(),
  salesRepId: z.string().uuid().optional().nullable(),
  awsAmount: z.number().int().min(0).optional().nullable(),
  hasManagementFee: z.boolean().default(false),
  billingMethod: z.enum(['대표님 직접 청구', '매월 10일 세금계산서 발행', '공공기관 별도 청구']).optional().nullable(),
  awsAm: z.string().optional().nullable(),
  awsAccountIds: z.array(z.string()).optional(),
  mspGrade: z.enum(['None', 'FREE', 'MSP10', 'MSP15', 'MSP20', 'ETC']).optional().nullable(),
  billingOn: z.boolean().default(false),
  billingOnAlias: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  techLeadIds: z.array(z.string().uuid()).default([]),
});

export type MspDetailInput = z.infer<typeof mspDetailSchema>;

export const eduOperationDateSchema = z.object({
  date: z.string(),
  hours: z.number().min(0).default(0),
});

export type EduOperationDateInput = z.infer<typeof eduOperationDateSchema>;

export const eduOperationSchema = z.object({
  operationName: z.string().min(1, '운영명을 입력해주세요'),
  location: z.string().optional().nullable(),
  targetOrg: z.string().optional().nullable(),
  dates: z.array(eduOperationDateSchema).default([]),
  contractedCount: z.number().int().min(0).optional().nullable(),
  recruitedCount: z.number().int().min(0).optional().nullable(),
  actualCount: z.number().int().min(0).optional().nullable(),
  providesLunch: z.boolean().default(false),
  providesSnack: z.boolean().default(false),
});

export type EduOperationInput = z.infer<typeof eduOperationSchema>;

export const stageChangeSchema = z.object({
  toStage: z.string().min(1, '단계를 선택해주세요'),
  note: z.string().optional().nullable(),
});

export type StageChangeInput = z.infer<typeof stageChangeSchema>;

export const contractListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: contractTypeEnum.optional(),
  stage: z.string().optional(),
  sortBy: z.string().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type ContractListQuery = z.infer<typeof contractListQuerySchema>;

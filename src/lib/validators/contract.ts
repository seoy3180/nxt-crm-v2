import { z } from 'zod';

const contractTypeEnum = z.enum(['msp', 'tt', 'dev']);
const currencyEnum = z.enum(['KRW', 'USD']);

export const contractCreateSchema = z.object({
  name: z.string().min(1, '계약명을 입력해주세요').max(200, '최대 200자까지 입력할 수 있습니다'),
  clientId: z.string().uuid('고객을 선택해주세요'),
  type: contractTypeEnum,
  description: z.string().optional().nullable(),
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
  billingLevel: z.string().optional().nullable(),
  creditShare: z.number().min(0).max(100).optional().nullable(),
  expectedMrr: z.number().int().min(0).optional().nullable(),
  payer: z.string().optional().nullable(),
  salesRep: z.string().optional().nullable(),
  awsAmount: z.number().int().min(0).optional().nullable(),
  hasManagementFee: z.boolean().default(false),
  paymentMethod: z.string().optional().nullable(),
});

export type MspDetailInput = z.infer<typeof mspDetailSchema>;

export const eduOperationSchema = z.object({
  operationName: z.string().min(1, '운영명을 입력해주세요'),
  location: z.string().optional().nullable(),
  targetOrg: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  totalHours: z.number().min(0).optional().nullable(),
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

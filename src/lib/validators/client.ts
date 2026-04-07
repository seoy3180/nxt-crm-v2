import { z } from 'zod';

const clientTypeEnum = z.enum(['univ', 'corp', 'govt', 'asso', 'etc']);
const clientGradeEnum = z.enum(['A', 'B', 'C', 'D', 'E']);
const businessTypeEnum = z.enum(['msp', 'tt', 'dev']);

export const clientCreateSchema = z.object({
  name: z.string().min(1, '고객명을 입력해주세요').max(200, '최대 200자까지 입력할 수 있습니다'),
  clientType: clientTypeEnum,
  grade: clientGradeEnum.optional(),
  businessTypes: z.array(businessTypeEnum).default([]),
  parentId: z.string().uuid().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  status: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
});

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;

export const clientUpdateSchema = clientCreateSchema.partial();
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;

export const contactCreateSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요'),
  email: z.string().email('올바른 이메일 형식이 아닙니다').optional().or(z.literal('')),
  phone: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  isPrimary: z.boolean().default(false),
});

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;

export const contactUpdateSchema = contactCreateSchema.partial();
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;

export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  clientType: clientTypeEnum.optional(),
  businessType: businessTypeEnum.optional(),
  sortBy: z.string().default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type ClientListQuery = z.infer<typeof clientListQuerySchema>;

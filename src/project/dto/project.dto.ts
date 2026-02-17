import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  clientName: z.string().max(200).optional().nullable(),
  ptName: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  startDate: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v))
    .optional()
    .nullable(),
  endDate: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v))
    .optional()
    .nullable(),
  contractValue: z.number().min(0).optional().nullable(),
  status: z
    .enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .optional()
    .default('PLANNING'),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  clientName: z.string().min(1).max(200).optional(),
  ptName: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  startDate: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v))
    .optional(),
  endDate: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v))
    .optional(),
  contractValue: z.number().min(0).optional(),
  status: z
    .enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'])
    .optional(),
});

export const AddProjectMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.string().optional().default('member'),
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;
export type AddProjectMemberDto = z.infer<typeof AddProjectMemberSchema>;

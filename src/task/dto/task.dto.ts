import { z } from 'zod';

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable(),
  assignedToId: z.string().min(1, 'Assigned user is required'),
  deadline: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v)),
  priority: z
    .enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
    .optional()
    .default('MEDIUM'),
  status: z
    .enum(['TODO', 'IN_PROGRESS', 'SUBMITTED', 'REVISION', 'DONE'])
    .optional()
    .default('TODO'),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  assignedToId: z.string().min(1).optional(),
  deadline: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v))
    .optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z
    .enum(['TODO', 'IN_PROGRESS', 'SUBMITTED', 'REVISION', 'DONE'])
    .optional(),
});

export const UpdateTaskStatusSchema = z.object({
  status: z.enum(['TODO', 'IN_PROGRESS', 'SUBMITTED', 'REVISION', 'DONE']),
});

export const CreateTaskCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000),
});

export type CreateTaskDto = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskDto = z.infer<typeof UpdateTaskSchema>;
export type UpdateTaskStatusDto = z.infer<typeof UpdateTaskStatusSchema>;
export type CreateTaskCommentDto = z.infer<typeof CreateTaskCommentSchema>;

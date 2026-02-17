import { z } from 'zod';

export const CreateProjectActivitySchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  activityDate: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v))
    .optional(),
});

export const UpdateProjectActivitySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  activityDate: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v))
    .optional(),
});

export type CreateProjectActivityDto = z.infer<typeof CreateProjectActivitySchema>;
export type UpdateProjectActivityDto = z.infer<typeof UpdateProjectActivitySchema>;

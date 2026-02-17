import { z } from 'zod';

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.enum(['INCOME', 'EXPENSE']),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;

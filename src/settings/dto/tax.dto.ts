import { z } from 'zod';

export const CreateTaxSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  percentage: z.number().min(0).max(100),
  isActive: z.boolean().optional().default(true),
});

export const UpdateTaxSchema = CreateTaxSchema.partial();

export type CreateTaxDto = z.infer<typeof CreateTaxSchema>;
export type UpdateTaxDto = z.infer<typeof UpdateTaxSchema>;

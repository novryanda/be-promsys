import { z } from 'zod';

export const CreateReimbursementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  amount: z.number().min(0, 'Amount must be positive'),
  categoryId: z.string().min(1, 'Category is required'),
  projectId: z.string().optional().nullable(),
});

export const RejectReimbursementSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required').max(1000),
});

export type CreateReimbursementDto = z.infer<typeof CreateReimbursementSchema>;
export type RejectReimbursementDto = z.infer<typeof RejectReimbursementSchema>;

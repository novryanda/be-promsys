import { z } from 'zod';

export const CreateInvoiceSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  projectId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  taxId: z.string().optional().nullable(),
  amount: z.number().min(0, 'Amount must be positive'),
  status: z.enum(['PAID', 'UNPAID', 'DEBT']).optional().default('UNPAID'),
  dueDate: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v))
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateInvoiceSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  projectId: z.string().optional().nullable(),
  vendorId: z.string().optional().nullable(),
  categoryId: z.string().min(1).optional(),
  taxId: z.string().optional().nullable(),
  amount: z.number().min(0).optional(),
  dueDate: z
    .string()
    .or(z.date())
    .transform((v) => new Date(v))
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateInvoiceStatusSchema = z.object({
  status: z.enum(['PAID', 'UNPAID', 'DEBT']),
});

export type CreateInvoiceDto = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceDto = z.infer<typeof UpdateInvoiceSchema>;
export type UpdateInvoiceStatusDto = z.infer<typeof UpdateInvoiceStatusSchema>;

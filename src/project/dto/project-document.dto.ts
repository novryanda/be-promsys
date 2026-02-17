import { z } from 'zod';

export const CreateProjectDocumentSchema = z.object({
  name: z.string().min(1, 'Document name is required').max(255),
  type: z.enum([
    'PROPOSAL',
    'TUTORIAL',
    'CONTRACT',
    'REPORT',
    'MINUTES',
    'OTHER',
  ]),
});

export const UpdateProjectDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z
    .enum(['PROPOSAL', 'TUTORIAL', 'CONTRACT', 'REPORT', 'MINUTES', 'OTHER'])
    .optional(),
});

export type CreateProjectDocumentDto = z.infer<
  typeof CreateProjectDocumentSchema
>;
export type UpdateProjectDocumentDto = z.infer<
  typeof UpdateProjectDocumentSchema
>;

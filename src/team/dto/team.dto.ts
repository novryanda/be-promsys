import { z } from 'zod';

export const CreateTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
});

export const UpdateTeamSchema = CreateTeamSchema.partial();

export const AddTeamMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export type CreateTeamDto = z.infer<typeof CreateTeamSchema>;
export type UpdateTeamDto = z.infer<typeof UpdateTeamSchema>;
export type AddTeamMemberDto = z.infer<typeof AddTeamMemberSchema>;

import { z } from 'zod';

export const CreateVendorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  location: z.string().min(1, 'Location is required').max(500),
  contactPerson: z.string().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export const UpdateVendorSchema = CreateVendorSchema.partial();

export type CreateVendorDto = z.infer<typeof CreateVendorSchema>;
export type UpdateVendorDto = z.infer<typeof UpdateVendorSchema>;

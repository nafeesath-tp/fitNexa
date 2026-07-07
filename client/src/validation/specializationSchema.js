import { z } from 'zod';

export const specializationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name cannot exceed 100 characters'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
});

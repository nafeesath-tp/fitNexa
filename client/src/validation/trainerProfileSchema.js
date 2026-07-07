import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_PDF_TYPES = ['application/pdf'];

export const trainerProfileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number format'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  experience: z.coerce.number().min(0, 'Experience cannot be negative').max(50, 'Experience seems unusually high'),
  specialization: z.coerce.number().min(1, 'Please select a specialization'),
  
  profile_image: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_IMAGE_TYPES.includes(files[0]?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ),

  certificate: z.any()
    .optional()
    .refine((files) => !files || files.length === 0 || files[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || ACCEPTED_PDF_TYPES.includes(files[0]?.type),
      "Only .pdf format is supported for certificates."
    ),
});

import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ACCEPTED_PDF_TYPES = ['application/pdf'];

export const trainerProfileSchema = z.object({
  first_name: z.string().min(2, 'First name must be at least 2 characters'),
  last_name: z.string().min(2, 'Last name must be at least 2 characters'),
  phone: z.string()
    .regex(/^[1-9][0-9]{9}$/, 'Phone number must be exactly 10 digits and cannot start with 0')
    .refine((val) => !/^(\d)\1{9}$/.test(val), 'Phone number cannot be all same digits')
    .refine((val) => !/^(1234567890)$/.test(val), 'Invalid phone number sequence'),
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  experience: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)), 
    z.number({ required_error: 'Experience is required', invalid_type_error: 'Experience must be a number' })
      .min(0, 'Experience cannot be negative')
      .max(50, 'Experience seems unusually high')
  ),
  specialization: z.preprocess(
    (val) => (val === '' || val === undefined ? undefined : Number(val)),
    z.number({ required_error: 'Please select a specialization', invalid_type_error: 'Please select a specialization' })
      .min(1, 'Please select a specialization')
  ),
  
  profile_image: z.any()
    .refine((files) => files && (files.length > 0 || typeof files === 'string'), "Profile image is required")
    .refine((files) => !files || files.length === 0 || typeof files === 'string' || files[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || typeof files === 'string' || ACCEPTED_IMAGE_TYPES.includes(files[0]?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ),

  certificate: z.any()
    .refine((files) => files && (files.length > 0 || typeof files === 'string'), "Professional certificate is required")
    .refine((files) => !files || files.length === 0 || typeof files === 'string' || files[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => !files || files.length === 0 || typeof files === 'string' || ACCEPTED_PDF_TYPES.includes(files[0]?.type),
      "Only .pdf format is supported for certificates."
    ),
});

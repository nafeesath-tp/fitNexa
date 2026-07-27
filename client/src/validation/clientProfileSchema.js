import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

// Helper: safely convert an empty string to undefined so optional
// number fields don't fail when the user clears an input.
const optionalNumber = (min, max, label) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number({ invalid_type_error: `${label} must be a number` })
      .min(min, `${label} must be at least ${min}`)
      .max(max, `${label} cannot exceed ${max}`)
      .optional()
  );

export const clientProfileSchema = z.object({
  // ── Step 1: Personal ──────────────────────────────────────────────────────
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string()
    .regex(/^[1-9][0-9]{9}$/, 'Phone number must be exactly 10 digits and cannot start with 0')
    .refine((val) => !/^(\d)\1{9}$/.test(val), 'Phone number cannot be all same digits')
    .refine((val) => !/^(1234567890)$/.test(val), 'Invalid phone number sequence')
    .optional()
    .or(z.literal('')),
  profile_image: z.any()
    .refine((files) => {
      if (!files || files.length === 0) return true;
      if (typeof files === 'string') return true;
      return files[0]?.size <= MAX_FILE_SIZE;
    }, `Max file size is 5MB.`)
    .refine((files) => {
      if (!files || files.length === 0) return true;
      if (typeof files === 'string') return true;
      return ACCEPTED_IMAGE_TYPES.includes(files[0]?.type);
    }, ".jpg, .jpeg, .png and .webp files are accepted.")
    .optional(),

  // ── Step 2: Basic & Health ────────────────────────────────────────────────
  // All optional to match the backend serializer.
  // The form UI marks them as required with labels, but the API accepts
  // partial profiles so the client can skip fields they prefer not to share.
  date_of_birth: z.string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Invalid date')
    .optional()
    .or(z.literal('')),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], {
    errorMap: () => ({ message: "Please select a gender" })
  }).optional().or(z.literal('')),
  height_cm:      optionalNumber(50,  300, 'Height (cm)'),
  weight_kg:      optionalNumber(20,  500, 'Weight (kg)'),
  target_weight_kg: optionalNumber(20, 500, 'Target weight (kg)'),

  // ── Step 3: Fitness Goals ─────────────────────────────────────────────────
  fitness_goal: z.enum([
    "LOSE_WEIGHT", "BUILD_MUSCLE", "IMPROVE_ENDURANCE",
    "INCREASE_FLEXIBILITY", "MAINTAIN_FITNESS", "GENERAL_HEALTH"
  ], {
    errorMap: () => ({ message: "Please select a fitness goal" })
  }).optional().or(z.literal('')),
  preferred_workout: z.enum([
    "STRENGTH_TRAINING", "CARDIO", "YOGA", "HIIT",
    "PILATES", "CROSSFIT", "SWIMMING", "CYCLING"
  ], {
    errorMap: () => ({ message: "Please select a preferred workout style" })
  }).optional().or(z.literal('')),
  experience_level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], {
    errorMap: () => ({ message: "Please select your experience level" })
  }).optional().or(z.literal('')),
  diet_preference: z.enum([
    "NONE", "VEGETARIAN", "VEGAN", "KETO",
    "PALEO", "GLUTEN_FREE", "DAIRY_FREE"
  ], {
    errorMap: () => ({ message: "Please select your dietary preference" })
  }).optional().or(z.literal('')),
  medical_condition: z.string().optional().or(z.literal('')),

}).refine(data => {
  // Cross-field: target weight must differ from current weight
  if (data.weight_kg !== undefined && data.target_weight_kg !== undefined) {
    return data.weight_kg !== data.target_weight_kg;
  }
  return true;
}, {
  message: "Target weight must differ from current weight",
  path: ["target_weight_kg"]
});

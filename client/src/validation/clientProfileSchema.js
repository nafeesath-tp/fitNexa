import { z } from 'zod';

// We make file optional or string (if already uploaded) for flexibility,
// but the browser File object itself is handled differently in formData.
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const clientProfileSchema = z.object({
  // Step 1: Personal
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
      if (!files || files.length === 0) return true; // Optional
      if (typeof files === 'string') return true; // Already uploaded URL
      return files[0]?.size <= MAX_FILE_SIZE;
    }, `Max file size is 5MB.`)
    .refine(
      (files) => {
        if (!files || files.length === 0) return true; // Optional
        if (typeof files === 'string') return true; // Already uploaded URL
        return ACCEPTED_IMAGE_TYPES.includes(files[0]?.type);
      },
      ".jpg, .jpeg, .png and .webp files are accepted."
    )
    .optional(),

  // Step 2: Basic & Health
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], { required_error: "Gender is required" }),
  height_cm: z.preprocess((val) => Number(val), 
    z.number({ required_error: "Height is required", invalid_type_error: "Height must be a number" }).min(50, 'Height must be at least 50cm').max(300, 'Height cannot exceed 300cm')
  ),
  weight_kg: z.preprocess((val) => Number(val), 
    z.number({ required_error: "Weight is required", invalid_type_error: "Weight must be a number" }).min(20, 'Weight must be at least 20kg').max(500, 'Weight cannot exceed 500kg')
  ),
  target_weight_kg: z.preprocess((val) => Number(val), 
    z.number({ required_error: "Target weight is required", invalid_type_error: "Target weight must be a number" }).min(20, 'Target weight must be at least 20kg').max(500, 'Target weight cannot exceed 500kg')
  ),

  // Step 3: Fitness Goals
  fitness_goal: z.enum([
    "LOSE_WEIGHT", "BUILD_MUSCLE", "IMPROVE_ENDURANCE", 
    "INCREASE_FLEXIBILITY", "MAINTAIN_FITNESS", "GENERAL_HEALTH"
  ], { required_error: "Please select a fitness goal" }),
  preferred_workout: z.enum([
    "STRENGTH_TRAINING", "CARDIO", "YOGA", "HIIT", 
    "PILATES", "CROSSFIT", "SWIMMING", "CYCLING"
  ], { required_error: "Please select a preferred workout style" }),
  experience_level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], { required_error: "Please select your experience level" }),
  diet_preference: z.enum([
    "NONE", "VEGETARIAN", "VEGAN", "KETO", 
    "PALEO", "GLUTEN_FREE", "DAIRY_FREE"
  ], { required_error: "Please select your dietary preference" }),
  medical_condition: z.string().optional().or(z.literal('')),
}).refine(data => {
  if (data.weight_kg !== undefined && data.target_weight_kg !== undefined) {
    return data.weight_kg !== data.target_weight_kg;
  }
  return true;
}, {
  message: "Target weight must differ from current weight",
  path: ["target_weight_kg"]
});

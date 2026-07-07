import { z } from 'zod';

// We make file optional or string (if already uploaded) for flexibility,
// but the browser File object itself is handled differently in formData.
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const clientProfileSchema = z.object({
  // Step 1: Personal
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(15).optional().or(z.literal('')),
  profile_image: z.any()
    .refine((files) => {
      if (!files || files.length === 0) return true; // Optional
      return files[0]?.size <= MAX_FILE_SIZE;
    }, `Max file size is 5MB.`)
    .refine(
      (files) => {
        if (!files || files.length === 0) return true; // Optional
        return ACCEPTED_IMAGE_TYPES.includes(files[0]?.type);
      },
      ".jpg, .jpeg, .png and .webp files are accepted."
    )
    .optional(),

  // Step 2: Basic & Health
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY", ""]).optional(),
  height_cm: z.preprocess((val) => (val === "" ? undefined : Number(val)), 
    z.number().min(50).max(300).optional()
  ),
  weight_kg: z.preprocess((val) => (val === "" ? undefined : Number(val)), 
    z.number().min(20).max(500).optional()
  ),
  target_weight_kg: z.preprocess((val) => (val === "" ? undefined : Number(val)), 
    z.number().min(20).max(500).optional()
  ),

  // Step 3: Fitness Goals
  fitness_goal: z.enum([
    "LOSE_WEIGHT", "BUILD_MUSCLE", "IMPROVE_ENDURANCE", 
    "INCREASE_FLEXIBILITY", "MAINTAIN_FITNESS", "GENERAL_HEALTH", ""
  ]).optional(),
  preferred_workout: z.enum([
    "STRENGTH_TRAINING", "CARDIO", "YOGA", "HIIT", 
    "PILATES", "CROSSFIT", "SWIMMING", "CYCLING", ""
  ]).optional(),
  experience_level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", ""]).optional(),
  diet_preference: z.enum([
    "NONE", "VEGETARIAN", "VEGAN", "KETO", 
    "PALEO", "GLUTEN_FREE", "DAIRY_FREE", ""
  ]).optional(),
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

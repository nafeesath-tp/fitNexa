import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number')
    .regex(/[@$!%*#?&]/, 'Password must contain at least one special character (@, $, !, %, *, #, ?, &)'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
  role: z.enum(['CLIENT', 'TRAINER'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
});

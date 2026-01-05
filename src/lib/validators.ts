import { z } from 'zod';

export const VisitorRegistrationSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters long" }),
  email: z.string().email({ message: "Invalid email address" }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number" }),
  company: z.string().optional(),
  photo: z.instanceof(FileList).optional(),
  purpose: z.string().min(3, { message: "Purpose must be at least 3 characters long" }),
  hostEmail: z.string().email({ message: "Invalid host email address" }).optional().or(z.literal('')),
  entityEmail: z.string().email({ message: "Invalid entity email address" }).optional().or(z.literal('')),
  notes: z.string().optional(),
});

export const LoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

export const SignupSchema = z
  .object({
    name: z.string().min(3, { message: "Name must be at least 3 characters long" }),
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
    confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters long" }),
    departmentId: z.string().uuid({ message: "Invalid department" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

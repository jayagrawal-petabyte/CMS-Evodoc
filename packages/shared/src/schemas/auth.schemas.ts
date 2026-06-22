import { z } from 'zod'

export const LoginSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
})

export const RegisterPatientSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional(),
  bloodGroup: z.string().optional(),
})

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
})

export const AuthResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string(),
    fullName: z.string(),
    role: z.enum(['Patient', 'Receptionist', 'Doctor']),
    phone: z.string().optional(),
  }),
})

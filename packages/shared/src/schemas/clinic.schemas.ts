import { z } from 'zod'

export const ClinicThemeSchema = z.object({
  primaryColor: z.string().default('#6366f1'),
  secondaryColor: z.string().default('#8b5cf6'),
  accentColor: z.string().default('#06b6d4'),
  fontFamily: z.enum(['Inter', 'Roboto', 'Poppins', 'Nunito', 'DM Sans']).default('Inter'),
  clinicDisplayName: z.string().min(1).max(100),
})

export const ClinicThemeResponseSchema = ClinicThemeSchema.extend({
  id: z.string(),
  clinicId: z.string(),
  logoBlobPath: z.string().nullable(),
  logoUrl: z.string().nullable(),
  updatedAt: z.string(),
})

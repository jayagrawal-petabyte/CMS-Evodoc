import { z } from 'zod'

export const UpdatePatientSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.enum(['Male', 'Female', 'Other']).nullable().optional(),
  bloodGroup: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

export const AllergySchema = z.object({
  allergen: z.string().min(1).max(100),
  reaction: z.string().optional(),
  severity: z.enum(['Mild', 'Moderate', 'Severe']).optional(),
})

export const ActiveMedicationSchema = z.object({
  drugName: z.string().min(1).max(100),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  prescribedBy: z.string().optional(),
  startedAt: z.string(),
  notes: z.string().optional(),
})

export const PatientDtoSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  dateOfBirth: z.string().nullable(),
  gender: z.string().nullable(),
  bloodGroup: z.string().nullable(),
  createdAt: z.string(),
})
